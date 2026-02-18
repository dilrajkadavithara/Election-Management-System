import os
import sys
import logging
from pathlib import Path

# Setup Paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR / "voter_vault"
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(PROJECT_DIR))

# Mandatory: Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
import django
django.setup()

from core.pdf_processor import PDFProcessor
from backend.state_manager import state_manager

def debug_extraction():
    # Find the latest uploaded PDF
    raw_dir = BASE_DIR / "data" / "raw_pdf"
    pdfs = sorted(list(raw_dir.glob("*.pdf")), key=os.path.getmtime, reverse=True)
    
    if not pdfs:
        print("❌ No PDFs found in data/raw_pdf")
        return

    latest_pdf = pdfs[0]
    print(f"🔍 Testing extraction on: {latest_pdf.name}")
    
    batch_id = "debug_" + os.path.basename(latest_pdf).split('_')[0]
    output_dir = BASE_DIR / "data" / "page_images" / batch_id
    
    # Initialize Processor
    # Try getting poppler from env
    poppler = os.getenv("POPPLER_PATH")
    print(f"⚙️ Using Poppler Path: {poppler or 'Internal Default'}")
    
    processor = PDFProcessor(poppler_path=poppler) if poppler else PDFProcessor()
    
    try:
        print("🚀 Starting conversion (this may take a minute)...")
        images = processor.convert_to_images(str(latest_pdf), str(output_dir), dpi=300)
        print(f"✅ Successfully converted {len(images)} pages!")
        for img in images[:3]: # Show first 3
            print(f"  - {img}")
    except Exception as e:
        print(f"❌ Extraction Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_extraction()
