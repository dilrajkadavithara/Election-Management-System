import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Setup Paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR / "voter_vault"
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(PROJECT_DIR))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
import django
django.setup()

from backend.tasks import run_extraction_task

def test_delay():
    print("Testing task dispatch...")
    try:
        # This should fail if Redis is not running
        res = run_extraction_task.delay("test_batch", 300)
        print(f"Task dispatched with ID: {res.id}")
    except Exception as e:
        print(f"❌ Dispatch failed: {e}")

if __name__ == "__main__":
    test_delay()
