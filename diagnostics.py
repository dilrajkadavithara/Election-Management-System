import os
import sys
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

def run_diagnostics():
    print("=== FINAL NEURAL AUDIT ===")
    from backend.state_manager import state_manager
    from core.batch_processor import BatchProcessor
    
    batches = state_manager.list_all_batches()
    if not batches:
        print("No batches found.")
        return

    # Sort by ID or just take the last one
    latest = batches[-1]
    print(f"LATEST BATCH: {latest.get('id')}")
    print(f"Status: {latest.get('status')}")
    print(f"Total Pages: {latest.get('total_pages')}")
    print(f"Processed Pages: {latest.get('pages_processed')}")
    print(f"Total Voters: {latest.get('total_voters')}")
    print(f"Results Count: {len(latest.get('results', []))}")
    print(f"Direct PDF Toggle: {latest.get('direct_pdf')}")
    print(f"Use Gemini Toggle: {latest.get('use_gemini')}")

    # Trial Initialization
    try:
        p = BatchProcessor()
        print("[PASS] BatchProcessor initialized.")
    except Exception as e:
        print(f"[FAIL] BatchProcessor Init Error: {e}")

if __name__ == "__main__":
    run_diagnostics()
