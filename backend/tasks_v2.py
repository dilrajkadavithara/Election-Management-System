"""V2 OCR Processing Task — Uses thinking_budget=0 for cost optimization.

This is a standalone Celery task that uses the V2 pipeline (batch_processor_v2).
It shares the same Celery app and state_manager as V1 but uses separate processing modules.
"""
import os
import sys
import logging
import threading
from pathlib import Path
from backend.celery_app import celery_app
from backend.state_manager import state_manager

# Setup Paths (same as tasks.py)
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

PROJECT_ROOT = BASE_DIR / "voter_vault"
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
import django
django.setup()

from backend.logger_setup import setup_logger
logger = setup_logger("CeleryTasksV2")


@celery_app.task(name="tasks.run_processing_v2")
def run_processing_task_v2(batch_id: str):
    """V2 processing task — identical flow to V1 but uses batch_processor_v2
    which has thinking_budget=0 for Gemini calls."""
    try:
        batch = state_manager.get_batch(batch_id)
        if not batch:
            return

        batch['status'] = 'processing'
        batch['engine_version'] = 'v2'
        state_manager.set_batch(batch_id, batch)

        update_lock = threading.Lock()

        # Import V2 processor
        from core.batch_processor_v2 import BatchProcessor
        processor = BatchProcessor()

        processing_path = str(batch['file_path'])
        logger.info(f"V2 Processing Batch {batch_id}. Source: {processing_path}")

        # Fallback page count fix
        try:
            from PyPDF2 import PdfReader
            with open(processing_path, 'rb') as f:
                batch['total_pages'] = len(PdfReader(f).pages)
                state_manager.set_batch(batch_id, batch)
        except Exception as page_check_err:
            logger.error(f"V2 Fallback page count failed: {page_check_err}")

        completed_pages = set()
        failed_pages = set()

        def update_progress(page_num, page_results, success=True):
            with update_lock:
                if state_manager.is_cancelled(batch_id):
                    logger.warning(f"V2 Batch {batch_id} cancelled. Stopping worker.")
                    return
                current_batch = state_manager.get_batch(batch_id)
                if not current_batch:
                    return

            if success:
                completed_pages.add(page_num)
            else:
                error_reason = page_results if isinstance(page_results, str) else "Unknown Failure"
                logger.error(f"V2 Page {page_num} FAILED. Reason: {error_reason}")
                failed_pages.add(page_num)
                if 'failed_pages' not in current_batch:
                    current_batch['failed_pages'] = []
                if page_num not in current_batch['failed_pages']:
                    current_batch['failed_pages'].append(page_num)

            existing_results = current_batch.get('results', [])

            if success and isinstance(page_results, list):
                start_id = len(existing_results) + 1
                for i, r in enumerate(page_results):
                    r['voter_id'] = f"tmp_{page_num}_{start_id + i}"
                    if 'Status' not in r:
                        r['Status'] = '\u2705 OK'
                existing_results.extend(page_results)

            current_batch['results'] = existing_results
            current_batch['total_voters'] = len(existing_results)
            current_batch['voters_processed'] = len(existing_results)
            current_batch['pages_processed'] = len(completed_pages) + len(failed_pages)
            current_batch['clean_count'] = len([r for r in existing_results if r.get('Status') == '\u2705 OK'])
            current_batch['flagged_count'] = len([r for r in existing_results if r.get('Status') != '\u2705 OK'])

            state_manager.set_batch(batch_id, current_batch)
            logger.info(f"V2 Neural Sync: Page {page_num} [{'OK' if success else 'FAIL'}] -> Total: {len(existing_results)} voters")

        # Page Range Logic (same as V1)
        total_pdf_pages = batch.get('total_pages', 0)
        if total_pdf_pages > 3:
            target_pages = list(range(3, total_pdf_pages))
        elif total_pdf_pages > 2:
            target_pages = list(range(3, total_pdf_pages + 1))
        else:
            target_pages = [1]
        logger.info(f"V2 Processing pages {target_pages[0]}-{target_pages[-1]} of {total_pdf_pages} total")

        current_batch = state_manager.get_batch(batch_id)
        if current_batch:
            current_batch['status_text'] = 'V2 Engine: Processing with optimized token usage...'
            state_manager.set_batch(batch_id, current_batch)

        results = processor.process_pdf_directly(
            processing_path, batch_id=batch_id,
            page_range=target_pages, callback=update_progress
        )

        # Final status update
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

            num_failed = len(batch.get('failed_pages', []))
            if num_failed == 0:
                batch['pages_processed'] = batch.get('total_pages', 0)
                batch['status'] = 'processed'
            else:
                batch['status'] = 'warning'
                batch['error'] = f"Missing data from {num_failed} pages. Check logs."

            if hasattr(processor, '_last_cost'):
                batch['cost'] = processor._last_cost

            batch['engine_version'] = 'v2'
            state_manager.set_batch(batch_id, batch)
            logger.info(f"V2 Extraction Complete for {batch_id}. Status: {batch['status']}. Total: {len(results)} voters.")

    except Exception as e:
        logger.error(f"V2 Processing Error for {batch_id}: {e}", exc_info=True)
        batch = state_manager.get_batch(batch_id)
        if batch:
            batch['status'] = 'error'
            batch['error'] = f"V2 Engine Error: {str(e)}"
            state_manager.set_batch(batch_id, batch)
