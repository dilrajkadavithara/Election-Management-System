import os
import sys
import django
from pathlib import Path
from django.conf import settings

# Mock Environment for Import Analysis
os.environ['DJANGO_SETTINGS_MODULE'] = 'voter_vault.settings'

ROOT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT_DIR / "voter_vault"

sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(PROJECT_ROOT))

# FORCE SQLITE MOCK (Prevents DB connection errors during check)
if not settings.configured:
    settings.configure(
        DATABASES={'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}},
        INSTALLED_APPS=[
            'django.contrib.auth', 
            'django.contrib.contenttypes', 
            'core_db',
        ],
        SECRET_KEY='checker',
    )

print("🔍 Starting Pre-Flight Build Check...")

try:
    print("Step 1: Django Setup...")
    django.setup()
    print("✅ Django Initialized.")

    print("Step 2: Backend Router Imports...")
    from backend.routers import auth, admin, voters, analytics, ocr, system, communications
    print("✅ All Routers Loaded Successfully.")

    print("\n✨ PRE-FLIGHT SUCCESS: Code is safe to push.")
except Exception as e:
    import traceback
    print("\n❌ BUILD FAILURE DETECTED:")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Message: {str(e)}")
    print("\nTraceback:")
    traceback.print_exc()
    sys.exit(1)
