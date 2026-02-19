import os
import sys
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

def test_neural_page():
    print("=== NEURAL PAGE TEST ===")
    from core.ocr_engine import OCREngine
    from core.batch_processor import BatchProcessor
    
    # Target one of the PDFs found in diagnostics
    pdf_dir = BASE_DIR / "data" / "raw_pdf"
    pdfs = list(pdf_dir.glob("*.pdf"))
    if not pdfs:
        print("No PDFs found for test.")
        return
        
    test_pdf = str(pdfs[0])
    print(f"Testing with PDF: {test_pdf}")
    
    engine = OCREngine()
    # Test single page extraction
    print("Attempting to extract Page 3...")
    res = engine.extract_from_pdf(test_pdf, page_num=3)
    
    print(f"Result Type: {type(res)}")
    print(f"Result Content: {res}")
    
    if res:
        print("[PASS] Neural Extraction returned data.")
    else:
        print("[FAIL] Neural Extraction returned nothing.")

if __name__ == "__main__":
    test_neural_page()
