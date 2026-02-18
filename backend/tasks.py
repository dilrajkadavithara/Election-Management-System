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
def run_extraction_task(batch_id: str, dpi: int):
    try:
        batch = state_manager.get_batch(batch_id)
        if not batch: return
        
        pdf_path = batch['file_path']
        p_dir = PAGES_DIR / batch_id
        c_dir = CROPS_DIR / batch_id
        p_dir.mkdir(exist_ok=True, parents=True)
        c_dir.mkdir(exist_ok=True, parents=True)

        # 1. Page Count
        try:
            from PyPDF2 import PdfReader
            with open(pdf_path, 'rb') as f:
                reader = PdfReader(f)
                batch['total_pages'] = len(reader.pages)
        except: pass
        
        state_manager.set_batch(batch_id, batch)

        # 2. Conversion & Processing
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
def run_processing_task(batch_id: str, use_gemini: bool = False):
    try:
        batch = state_manager.get_batch(batch_id)
        if not batch: return
        
        c_dir = CROPS_DIR / batch_id
        voter_files = sorted(list(c_dir.glob("*.png")))
        batch['total_voters'] = len(voter_files)
        batch['use_gemini'] = use_gemini
        state_manager.set_batch(batch_id, batch)
        
        results = []
        clean_count = 0
        flagged_count = 0
        error_stats = {}
        
        cpu_count = multiprocessing.cpu_count()
        # For Gemini, we don't want too high concurrency to avoid network congestion, 
        if use_gemini:
            # Gemini is I/O Bound. Threads are better (especially on Windows).
            # 30 workers is the sweet spot for 8GB RAM / high-speed Gemini processing.
            workers = 30
            executor_class = concurrent.futures.ThreadPoolExecutor
        else:
            # For Tesseract (CPU-bound), use ProcessPoolExecutor
            # even if API limits are high. Let's cap at 4 for Gemini, or 8 for Tesseract.
            workers = max(1, min(cpu_count - 1, 8)) # Cap at 8 for Tesseract
            executor_class = concurrent.futures.ProcessPoolExecutor
        
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
