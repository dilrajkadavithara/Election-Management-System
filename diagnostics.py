import os
import sys
from pathlib import Path

# Setup paths (same as tasks.py)
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

def run_diagnostics():
    print("=== ELECTION ENGINE BIRD'S-EYE AUDIT ===")
    
    # 1. Check Imports
    try:
        from core.batch_processor import BatchProcessor
        from backend.state_manager import state_manager
        print("[PASS] Core modules imported successfully.")
    except Exception as e:
        print(f"[FAIL] Import Error: {e}")
        return

    # 2. Check Class Integrity
    p = BatchProcessor()
    if hasattr(p, 'process_pdf_directly'):
        print("[PASS] BatchProcessor has 'process_pdf_directly' method.")
    else:
        print("[FAIL] BatchProcessor MISSING 'process_pdf_directly' method.")

    # 3. Check Persistence (Redis)
    batches = state_manager.list_all_batches()
    print(f"[INFO] Active Batches in Redis: {len(batches)}")
    for b in batches:
        print(f"       -> ID: {b.get('id')} | Status: {b.get('status')} | Direct: {b.get('direct_pdf')}")

    # 4. Check Shared Filesystem
    raw_pdf_dir = BASE_DIR / "data" / "raw_pdf"
    if raw_pdf_dir.exists():
        files = list(raw_pdf_dir.glob("*.pdf"))
        print(f"[PASS] Shared PDF Directory found. Files: {len(files)}")
        for f in files[:3]: # Show first 3
            print(f"       -> {f.name}")
    else:
        print("[FAIL] Shared PDF Directory MISSING at /app/data/raw_pdf")

if __name__ == "__main__":
    run_diagnostics()
