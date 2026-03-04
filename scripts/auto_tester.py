import asyncio
import os
import sys
import logging
from pathlib import Path

# Setup paths for Django Environment inside Docker
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
PROJECT_ROOT = BASE_DIR / "voter_vault"
sys.path.insert(0, str(PROJECT_ROOT))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
import django
django.setup()

from backend.state_manager import state_manager
from core.pdf_processor import PDFProcessor
from core.batch_processor import BatchProcessor
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AutoTester")

async def test_extraction():
    logger.info("Starting targeted extraction sequence directly inside backend memory...")
    
    pdf_path = BASE_DIR / "data" / "raw_pdf" / "2026-EROLLGEN-S11-84-SIR-FinalRoll-Revision1-MAL-11-WI.pdf"
    
    if not pdf_path.exists():
        found = list((BASE_DIR / "data" / "raw_pdf").glob("*.pdf"))
        if found:
             pdf_path = found[-1]
             logger.info(f"Using found PDF: {pdf_path}")
        else:
             logger.error("No PDFs found to test.")
             return

    logger.info(f"Found Target PDF: {pdf_path}")
    processor = BatchProcessor()
    
    start_time = asyncio.get_event_loop().time()
    logger.info("Sending Page 4,5,6 to Gemini using process_pdf_directly...")
    
    try:
        data = processor.process_pdf_directly(str(pdf_path), page_range=[4, 6])
        print("\n\n=== EXTRACTION RESULTS ===")
        print(f"Items found: {len(data)}")
        if data:
            print(f"First 2 items: {data[:2]}")
        else:
            print("NO DATA RETURNED.")
            
    except Exception as e:
        logger.error(f"Test crash: {e}")
    finally:
        end_time = asyncio.get_event_loop().time()
        logger.info(f"Completed in {end_time - start_time:.1f} seconds")

if __name__ == "__main__":
    asyncio.run(test_extraction())
