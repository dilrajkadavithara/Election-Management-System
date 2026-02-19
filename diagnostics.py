import os
import sys
import json
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

def run_diagnostics():
    from backend.state_manager import state_manager
    print("=== DEEP STATE AUDIT ===")
    
    batches = state_manager.list_all_batches()
    if not batches:
        print("No batches found in Redis.")
        return

    for b in batches:
        print(f"\n--- BATCH: {b.get('id')} ---")
        print(f"Status: {b.get('status')}")
        print(f"Direct PDF: {b.get('direct_pdf')}")
        print(f"Use Gemini: {b.get('use_gemini')}")
        print(f"Total Pages: {b.get('total_pages')}")
        print(f"Pages Processed: {b.get('pages_processed')}")
        print(f"Total Voters: {b.get('total_voters')}")
        print(f"Results Count: {len(b.get('results', []))}")
        
        # Check for errors in results
        results = b.get('results', [])
        if results:
            print(f"Sample Result: {results[0] if len(results) > 0 else 'None'}")
        
    # Check Celery status if possible
    print("\n--- SYSTEM HEALTH ---")
    raw_pdf_dir = BASE_DIR / "data" / "raw_pdf"
    print(f"Raw PDFs present: {len(list(raw_pdf_dir.glob('*.pdf')))}")

if __name__ == "__main__":
    run_diagnostics()
