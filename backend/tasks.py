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
        p_dir = PAGES_DIR / batch_id
        c_dir = CROPS_DIR / batch_id
        # 0. Bird's-Eye Synchronization: Prefer database state over passed arguments
        direct_pdf = batch.get('direct_pdf', direct_pdf)

        # 1. Page Count (Using PyPDF2)
        try:
            from PyPDF2 import PdfReader
            with open(pdf_path, 'rb') as f:
                reader = PdfReader(f)
                batch['total_pages'] = len(reader.pages)
        except Exception as e:
            logger.error(f"Page count failure: {e}")

        if direct_pdf:
            # --- STRATEGIC SHORTCUT (Safe Mode) ---
            # Explicitly persist the direct_pdf flag for the next phase
            batch['direct_pdf'] = True
            batch['pages_processed'] = batch.get('total_pages', 0)
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
            pdf_path = Path(batch['file_path'])
            
            # --- SLICING SAFETY: Remove first 2 pages (Cover/Index) ---
            sliced_pdf_path = pdf_path.parent / f"sliced_{pdf_path.name}"
            try:
                from PyPDF2 import PdfReader, PdfWriter
                reader = PdfReader(pdf_path)
                writer = PdfWriter()
                # Page index starts at 0, so 2 is the 3rd page
                if len(reader.pages) > 2:
                    for i in range(2, len(reader.pages)):
                        writer.add_page(reader.pages[i])
                    with open(sliced_pdf_path, "wb") as f:
                        writer.write(f)
                    processing_path = str(sliced_pdf_path)
                else:
                    processing_path = str(pdf_path)
            except Exception as e:
                logger.error(f"Slicing error: {e}")
                processing_path = str(pdf_path)

            processor = BatchProcessor()
            
            # --- PROGRESS CALLBACK SYSTEM ---
            def update_progress(page_num, page_results):
                current_batch = state_manager.get_batch(batch_id)
                if not current_batch: return
                
                # Append new results to the master list
                existing_results = current_batch.get('results', [])
                existing_results.extend(page_results)
                
                # Update counters
                current_batch['results'] = existing_results
                current_batch['total_voters'] = len(existing_results)
                current_batch['voters_processed'] = len(existing_results)
                current_batch['pages_processed'] = page_num if page_num else current_batch.get('total_pages', 0)
                current_batch['clean_count'] = len([r for r in existing_results if r.get('Status') == '✅ OK'])
                current_batch['flagged_count'] = len([r for r in existing_results if r.get('Status') != '✅ OK'])
                
                state_manager.set_batch(batch_id, current_batch)
                logger.info(f"Progress Update: Page {page_num} finished. Total Voters: {len(existing_results)}")

            # Generate target page range (3 to END if sliced, or 1 to END)
            total_pdf_pages = batch.get('total_pages', 0)
            if total_pdf_pages > 2:
                # We sliced off the first 2, so the remaining pages are labeled 3, 4, 5...
                target_pages = list(range(3, total_pdf_pages + 1))
            else:
                target_pages = list(range(1, total_pdf_pages + 1))

            results = processor.process_pdf_directly(processing_path, page_range=target_pages, callback=update_progress)
            
            # Clean up sliced temp file
            if os.path.exists(sliced_pdf_path):
                try: os.remove(sliced_pdf_path)
                except: pass

            # Final status update
            batch = state_manager.get_batch(batch_id)
            batch['status'] = 'processed'
            state_manager.set_batch(batch_id, batch)
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
