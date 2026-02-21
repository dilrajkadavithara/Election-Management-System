import os
import sys
import logging
import gc
import concurrent.futures
import multiprocessing
from pathlib import Path
from backend.celery_app import celery_app
from backend.state_manager import state_manager

# Setup Paths (Replicating main.py logic for standalone worker)
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
    
# Fix for Nested Django Project Structure
PROJECT_ROOT = BASE_DIR / "voter_vault"
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Mandatory: Setup Django for the worker
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
import django
django.setup()

# Import core models/logic after django.setup()
from core.pdf_processor import PDFProcessor
from core.detector import VoterDetector
from core.batch_processor import BatchProcessor
from core.db_bridge import save_booth_data

# Logging
logger = logging.getLogger("CeleryTasks")

# Constants
DATA_DIR = BASE_DIR / "data"
PAGES_DIR = DATA_DIR / "page_images"
CROPS_DIR = DATA_DIR / "voter_crops"
poppler = os.getenv("POPPLER_PATH")

# Initialize Processors
pdf_processor = PDFProcessor(poppler_path=poppler) if poppler else PDFProcessor()
detector = VoterDetector()
batch_processor = BatchProcessor()

def process_single_voter(args):
    """Helper for parallel processing"""
    img_path_str, voter_id, use_gemini = args
    processor = BatchProcessor() 
    res = processor.process_box(img_path_str, voter_id, use_gemini=use_gemini)
    res['voter_id'] = voter_id
    res['image_name'] = os.path.basename(img_path_str)
    return res

@celery_app.task(name="tasks.run_extraction")
def run_extraction_task(batch_id: str, dpi: int, direct_pdf: bool = False):
    try:
        batch = state_manager.get_batch(batch_id)
        if not batch: return
        
        pdf_path = batch['file_path']
        
        # 0. Bird's-Eye Synchronization: Prefer database state over passed arguments
        direct_pdf = batch.get('direct_pdf', direct_pdf)

        # 1. Page Count (Using PyPDF2 or Info)
        try:
            from PyPDF2 import PdfReader
            with open(pdf_path, 'rb') as f:
                reader = PdfReader(f)
                batch['total_pages'] = len(reader.pages)
        except Exception as e:
            logger.error(f"Page count failure: {e}")

        p_dir = PAGES_DIR / batch_id
        c_dir = CROPS_DIR / batch_id

        if direct_pdf:
            # --- STRATEGIC SHORTCUT (Safe Mode) ---
            batch['direct_pdf'] = True
            batch['pages_processed'] = 0 
            batch['status'] = 'extracted'
            state_manager.set_batch(batch_id, batch)
            logger.info(f"Batch {batch_id} ready for Strategic AI extraction.")
            return

        # 2. Conversion & Processing (Legacy Mode)
        page_images = pdf_processor.convert_to_images(pdf_path, str(p_dir), dpi=dpi)
        batch['total_pages'] = len(page_images)
        state_manager.set_batch(batch_id, batch)
        
        total_voters = 0
        for i, page_path in enumerate(page_images):
            if state_manager.is_cancelled(batch_id):
                state_manager.delete_batch(batch_id)
                gc.collect()
                return

            batch['pages_processed'] = i + 1
            state_manager.set_batch(batch_id, batch)
            
            boxes = detector.detect_voter_boxes(page_path) 
            if boxes:
                count = detector.crop_and_save(page_path, boxes, str(c_dir), i+1, start_index=total_voters)
                total_voters += count
        
        batch['total_voters'] = total_voters
        batch['status'] = 'extracted'
        state_manager.set_batch(batch_id, batch)
    except Exception as e:
        logger.error(f"Extraction Error: {e}")
        batch = state_manager.get_batch(batch_id)
        if batch:
            batch['status'] = 'error'
            batch['error'] = str(e)
            state_manager.set_batch(batch_id, batch)

@celery_app.task(name="tasks.run_processing")
def run_processing_task(batch_id: str, use_gemini: bool = False, direct_pdf: bool = False):
    try:
        batch = state_manager.get_batch(batch_id)
        if not batch: return
        
        # Bird's-Eye Synchronization: Ensure we know if we are in Safe Mode
        direct_pdf = batch.get('direct_pdf', direct_pdf)
        use_gemini = batch.get('use_gemini', use_gemini)
        
        batch['status'] = 'processing'
        state_manager.set_batch(batch_id, batch)

        if direct_pdf:
            # Force Gemini for Direct PDF mode as Tesseract can't process raw PDFs
            use_gemini = True 
            batch['use_gemini'] = True
            state_manager.set_batch(batch_id, batch)
            
            processing_path = str(batch['file_path'])
            logger.info(f"Steaming Direct PDF for Batch {batch_id}. Source: {processing_path}")

            processor = BatchProcessor()
            
            completed_pages = set() # Track unique finished pages
            def update_progress(page_num, page_results):
                current_batch = state_manager.get_batch(batch_id)
                if not current_batch: return
                
                completed_pages.add(page_num)
                existing_results = current_batch.get('results', [])
                
                # Critical Fix: Assign temporary tracer IDs to results so API doesn't crash on missing 'voter_id'
                start_id = len(existing_results) + 1
                for i, r in enumerate(page_results):
                    r['voter_id'] = f"tmp_{page_num}_{start_id + i}"
                    # Basic status check if not already present
                    if 'Status' not in r: r['Status'] = '✅ OK'
                
                existing_results.extend(page_results)
                
                # Update counters
                current_batch['results'] = existing_results
                current_batch['total_voters'] = len(existing_results)
                current_batch['voters_processed'] = len(existing_results)
                current_batch['pages_processed'] = len(completed_pages)
                current_batch['clean_count'] = len([r for r in existing_results if r.get('Status') == '✅ OK'])
                current_batch['flagged_count'] = len([r for r in existing_results if r.get('Status') != '✅ OK'])
                
                state_manager.set_batch(batch_id, current_batch)
                logger.info(f"Neural Sync: Page {page_num} -> +{len(page_results)} voters (Total: {len(existing_results)})")

            # Page Range Logic: Skip cover pages (1 & 2) but process the rest
            total_pdf_pages = batch.get('total_pages', 0)
            target_pages = list(range(3, total_pdf_pages + 1)) if total_pdf_pages > 2 else [1]

            results = processor.process_pdf_directly(processing_path, page_range=target_pages, callback=update_progress)
            
            # Final status update: Save the perfectly ORDERED results
            batch = state_manager.get_batch(batch_id)
            if batch:
                batch['results'] = results
                batch['total_voters'] = len(results)
                batch['voters_processed'] = len(results)
                batch['pages_processed'] = batch.get('total_pages', 0)
                batch['status'] = 'processed'
                state_manager.set_batch(batch_id, batch)
                logger.info(f"Parallel Extraction Complete for {batch_id}: {len(results)} voters saved.")
            return

        # --- LEGACY IMAGE-BASED FLOW ---
        c_dir = CROPS_DIR / batch_id
        voter_files = sorted(list(c_dir.glob("*.png")))
        batch['total_voters'] = len(voter_files)
        state_manager.set_batch(batch_id, batch)
        
        results = []
        clean_count = 0
        flagged_count = 0
        error_stats = {}
        
        # force threads to avoid OOM forking
        import concurrent.futures
        
        # Always use ThreadPoolExecutor on low-RAM servers
        # Processes duplicate memory (100MB+ overhead per worker), Threads share memory.
        executor_class = concurrent.futures.ThreadPoolExecutor
        workers = 2 # Safe concurrency limit
        
        with executor_class(max_workers=workers) as executor:
            tasks = [(str(p), i+1, use_gemini) for i, p in enumerate(voter_files)]
            future_to_id = {executor.submit(process_single_voter, t): t[1] for t in tasks}
            
            for i, future in enumerate(concurrent.futures.as_completed(future_to_id)):
                if state_manager.is_cancelled(batch_id):
                    state_manager.delete_batch(batch_id)
                    gc.collect()
                    return
                
                try:
                    res = future.result()
                    results.append(res)
                    if res.get('Status') == '✅ OK': clean_count += 1
                    else: 
                        flagged_count += 1
                        flags = str(res.get('Flags', '')).split(", ")
                        for f in flags:
                            if f and not f.startswith("("):
                                error_stats[f] = error_stats.get(f, 0) + 1
                        
                    current_batch = state_manager.get_batch(batch_id)
                    if current_batch:
                        current_batch['clean_count'] = clean_count
                        current_batch['flagged_count'] = flagged_count
                        current_batch['error_stats'] = error_stats
                        current_batch['voters_processed'] = i + 1
                        state_manager.set_batch(batch_id, current_batch)
                except Exception as exc:
                    logger.error(f"Voter processing error: {exc}")
                    flagged_count += 1
                    current_batch = state_manager.get_batch(batch_id)
                    if current_batch:
                        current_batch['flagged_count'] = flagged_count
                        current_batch['voters_processed'] = i + 1
                        state_manager.set_batch(batch_id, current_batch)

        results.sort(key=lambda x: x['voter_id'])
        final_batch = state_manager.get_batch(batch_id)
        if final_batch:
            final_batch['results'] = results
            final_batch['status'] = 'processed'
            state_manager.set_batch(batch_id, final_batch)
            
    except Exception as e:
        logger.error(f"Processing Error: {e}")
        error_batch = state_manager.get_batch(batch_id)
        if error_batch:
            error_batch['status'] = 'error'
            error_batch['error'] = str(e)
            state_manager.set_batch(batch_id, error_batch)
