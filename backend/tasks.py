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
from backend.logger_setup import setup_logger
logger = setup_logger("CeleryTasks")

# Constants
DATA_DIR = BASE_DIR / "data"
PAGES_DIR = DATA_DIR / "page_images"
CROPS_DIR = DATA_DIR / "voter_crops"
poppler = os.getenv("POPPLER_PATH")

# Initialize Processors correctly for the worker process
pdf_processor = PDFProcessor(poppler_path=poppler)
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

        # Idempotency: skip if already extracted or further along
        if batch.get('status') in ('extracted', 'processing', 'completed'):
            logger.info(f"Batch {batch_id} already in status '{batch['status']}', skipping extraction.")
            return

        pdf_path = batch['file_path']
        
        # 0. Bird's-Eye Synchronization: Prefer database state over passed arguments
        direct_pdf = batch.get('direct_pdf', direct_pdf)

        # 1. Page Count (Using PyPDF2 or Info) — persist immediately so UI always sees it
        try:
            from PyPDF2 import PdfReader
            with open(pdf_path, 'rb') as f:
                reader = PdfReader(f)
                batch['total_pages'] = len(reader.pages)
                logger.info(f"Batch {batch_id}: PDF has {batch['total_pages']} pages.")
        except Exception as e:
            logger.error(f"Page count failure: {e}")
        # Persist page count to state BEFORE any branching so the UI always reflects it
        state_manager.set_batch(batch_id, batch)

        p_dir = PAGES_DIR / batch_id
        c_dir = CROPS_DIR / batch_id

        # All modes now use Gemini page-by-page — rendering handled inside process_pdf_directly
        batch['direct_pdf'] = True
        batch['pages_processed'] = 0
        batch['status'] = 'extracted'
        batch['status_text'] = 'Ready for Gemini page-by-page extraction at 300 DPI.'
        state_manager.set_batch(batch_id, batch)
        logger.info(f"Batch {batch_id} ready for Gemini extraction ({batch['total_pages']} pages).")
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
        
        # Always use Gemini page-by-page extraction (renders at 300 DPI internally)
        # Tesseract+crop legacy flow is deprecated — Gemini reads full pages directly
        direct_pdf = True
        use_gemini = True
        
        batch['status'] = 'processing'
        state_manager.set_batch(batch_id, batch)

        import threading
        update_lock = threading.Lock()
        
        if direct_pdf:
            # Force Gemini for Direct PDF mode as Tesseract can't process raw PDFs
            use_gemini = True 
            batch['use_gemini'] = True
            state_manager.set_batch(batch_id, batch)
            
            processing_path = str(batch['file_path'])
            logger.info(f"Steaming Direct PDF for Batch {batch_id}. Source: {processing_path}")

            # 🚨 Fallback fix: If total_pages was dropped in redis race conditions, lock it here
            try:
                from PyPDF2 import PdfReader
                with open(processing_path, 'rb') as f:
                    batch['total_pages'] = len(PdfReader(f).pages)
                    state_manager.set_batch(batch_id, batch)
            except Exception as page_check_err:
                logger.error(f"Fallback page count failed: {page_check_err}")

            processor = BatchProcessor()
            
            completed_pages = set() # Track unique finished pages
            failed_pages = set()    # Track unique failed pages
            def update_progress(page_num, page_results, success=True):
                with update_lock:
                    if state_manager.is_cancelled(batch_id):
                        logger.warning(f"🛑 Batch {batch_id} cancelled. Stopping worker.")
                        return
                    current_batch = state_manager.get_batch(batch_id)
                    if not current_batch: return
                
                if success:
                    completed_pages.add(page_num)
                else:
                    error_reason = page_results if isinstance(page_results, str) else "Unknown Failure"
                    logger.error(f"⚠️ Page {page_num} marked as FAILED in Integrity Shield. Reason: {error_reason}")
                    failed_pages.add(page_num)
                    # Track failed pages for UI warning
                    if 'failed_pages' not in current_batch: current_batch['failed_pages'] = []
                    if page_num not in current_batch['failed_pages']:
                        current_batch['failed_pages'].append(page_num)
                
                existing_results = current_batch.get('results', [])
                
                if success and isinstance(page_results, list):
                    # Assign temporary tracer IDs to results
                    start_id = len(existing_results) + 1
                    for i, r in enumerate(page_results):
                        r['voter_id'] = f"tmp_{page_num}_{start_id + i}"
                        if 'Status' not in r: r['Status'] = '✅ OK'
                    
                    existing_results.extend(page_results)
                
                # Update counters
                current_batch['results'] = existing_results
                current_batch['total_voters'] = len(existing_results)
                current_batch['voters_processed'] = len(existing_results)
                
                # Progress: Sum of successful + failed. Forces 100% even on unreadable pages.
                current_batch['pages_processed'] = len(completed_pages) + len(failed_pages)
                
                current_batch['clean_count'] = len([r for r in existing_results if r.get('Status') == '✅ OK'])
                current_batch['flagged_count'] = len([r for r in existing_results if r.get('Status') != '✅ OK'])
                
                state_manager.set_batch(batch_id, current_batch)
                logger.info(f"Neural Sync: Page {page_num} [{'OK' if success else 'FAIL'}] -> Total: {len(existing_results)} voters")

            # Page Range Logic: Skip cover pages (1 & 2) AND the last page (back-cover/certification).
            # Both are structural pages in Kerala electoral rolls that contain no voter records.
            total_pdf_pages = batch.get('total_pages', 0)
            if total_pdf_pages > 3:
                target_pages = list(range(3, total_pdf_pages))  # excludes page 1, 2 AND last page
            elif total_pdf_pages > 2:
                target_pages = list(range(3, total_pdf_pages + 1))  # tiny PDF fallback
            else:
                target_pages = [1]
            logger.info(f"Processing pages {target_pages[0]}–{target_pages[-1]} of {total_pdf_pages} total (skipping covers + back-cover)")

            # Update status to show surgical phase is starting
            current_batch = state_manager.get_batch(batch_id)
            if current_batch:
                current_batch['status_text'] = 'Phase 1 complete. Running serial gap analysis...'
                state_manager.set_batch(batch_id, current_batch)

            results = processor.process_pdf_directly(processing_path, batch_id=batch_id, page_range=target_pages, callback=update_progress)

            # Final status update: Save the perfectly ORDERED results
            batch = state_manager.get_batch(batch_id)
            if batch:
                batch['results'] = results
                batch['total_voters'] = len(results)
                batch['voters_processed'] = len(results)

                # Serial gap validation
                all_serials = [int(v.get("Serial_OCR", 0)) for v in results if str(v.get("Serial_OCR", "")).isdigit()]
                if all_serials:
                    expected = set(range(min(all_serials), max(all_serials) + 1))
                    found = set(all_serials)
                    gaps = len(expected - found)
                    batch['serial_gaps'] = gaps
                    batch['serial_range'] = f"{min(all_serials)}-{max(all_serials)}"

                # If everything finished, mark as processed
                num_failed = len(batch.get('failed_pages', []))
                if num_failed == 0:
                    batch['pages_processed'] = batch.get('total_pages', 0) # Honest 100%
                    batch['status'] = 'processed'
                else:
                    batch['status'] = 'warning'
                    batch['error'] = f"Missing data from {num_failed} pages. Check logs."

                # Store cost data from per-box extraction tracking
                if hasattr(processor, '_last_cost'):
                    batch['cost'] = processor._last_cost

                state_manager.set_batch(batch_id, batch)
                logger.info(f"Extraction Cycle Finished for {batch_id}. Status: {batch['status']}. Total: {len(results)} voters. Serial gaps: {batch.get('serial_gaps', 'N/A')}")
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
                    if isinstance(res, dict):
                        if res.get('Status') == '✅ OK': clean_count += 1
                        else: 
                            flagged_count += 1
                            flags = str(res.get('Flags', '')).split(", ")
                            for f in flags:
                                if f and not f.startswith("("):
                                    error_stats[f] = error_stats.get(f, 0) + 1
                    else:
                        flagged_count += 1
                        error_stats['Parsing_Error'] = error_stats.get('Parsing_Error', 0) + 1
                        
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

@celery_app.task(name="tasks.janitor_cleanup")
def janitor_cleanup():
    """Janitor: Deletes temporary OCR batch folders older than 48 hours if not actively in use."""
    import time
    import shutil

    # Get active batch IDs to avoid deleting in-use data
    active_batches = state_manager.list_all_batches()
    active_ids = {b.get('id') for b in active_batches if b.get('status') in ('uploaded', 'extracting', 'processing', 'extracted')}

    target_dirs = [PAGES_DIR, CROPS_DIR]
    now = time.time()
    retention_seconds = 48 * 3600

    deleted_count = 0
    for base_dir in target_dirs:
        if not base_dir.exists(): continue

        for batch_dir in base_dir.iterdir():
            if batch_dir.is_dir():
                # Skip directories belonging to active batches
                if any(aid in batch_dir.name for aid in active_ids):
                    continue
                try:
                    mtime = batch_dir.stat().st_mtime
                    if now - mtime > retention_seconds:
                        shutil.rmtree(str(batch_dir))
                        deleted_count += 1
                        logger.info(f"Janitor: Cleaned up stagnant batch folder: {batch_dir.name}")
                except Exception as e:
                    logger.error(f"Janitor failed to process {batch_dir.name}: {e}")

    return f"Cleanup complete. Removed {deleted_count} stagnant folders."


@celery_app.task(name="tasks.snapshot_daily_progress")
def snapshot_daily_progress() -> str:
    """
    Daily snapshot: For each booth, count digitized voters (all 4 fields present),
    leaning totals, and compute deltas from yesterday's snapshot.
    Creates/updates DailyProgress records for today.
    """
    from datetime import date, timedelta
    from django.db.models import Count, Q
    from core_db.models import Booth, Voter, DailyProgress
    from core.db_bridge import DIGITIZED_Q

    today = date.today()
    yesterday = today - timedelta(days=1)

    # Single query: aggregate per-booth stats
    booth_stats = Voter.objects.values('booth_id').annotate(
        digitized=Count('id', filter=DIGITIZED_Q),
        udf=Count('id', filter=Q(voter_leaning='UDF')),
        ldf=Count('id', filter=Q(voter_leaning='LDF')),
        nda=Count('id', filter=Q(voter_leaning='NDA')),
        neutral=Count('id', filter=Q(voter_leaning='NEUTRAL')),
    )

    # Fetch yesterday's snapshots for delta calculation
    yesterday_snaps: dict[int, DailyProgress] = {
        dp.booth_id: dp
        for dp in DailyProgress.objects.filter(date=yesterday)
    }

    created_count = 0
    updated_count = 0

    for row in booth_stats:
        bid: int = row['booth_id']
        y = yesterday_snaps.get(bid)

        new_digitized = row['digitized'] - (y.digitized_total if y else 0)
        new_udf = row['udf'] - (y.udf_total if y else 0)
        new_ldf = row['ldf'] - (y.ldf_total if y else 0)
        new_nda = row['nda'] - (y.nda_total if y else 0)

        # Winning chance: largest party share of digitized voters
        d = max(1, row['digitized'])
        max_party = max(row['udf'], row['ldf'], row['nda'])
        winning_chance = round(min(max_party / d, 1.0), 4)

        _, created = DailyProgress.objects.update_or_create(
            booth_id=bid,
            date=today,
            defaults={
                'digitized_total': row['digitized'],
                'udf_total': row['udf'],
                'ldf_total': row['ldf'],
                'nda_total': row['nda'],
                'neutral_total': row['neutral'],
                'new_digitized': new_digitized,
                'new_udf': new_udf,
                'new_ldf': new_ldf,
                'new_nda': new_nda,
                'winning_chance': winning_chance,
            }
        )
        if created:
            created_count += 1
        else:
            updated_count += 1

    logger.info(f"DailyProgress snapshot for {today}: {created_count} created, {updated_count} updated")
    return f"Snapshot complete for {today}: {created_count} created, {updated_count} updated."
