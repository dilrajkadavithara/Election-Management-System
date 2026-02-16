import sys
import os
import uvicorn
from pathlib import Path

# 1. Setup Python Path
# This ensures 'core', 'backend', and 'voter_vault' are always importable
ROOT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = ROOT_DIR / "voter_vault"
sys.path.insert(0, str(ROOT_DIR))
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

# 2. Entry Point
if __name__ == "__main__":
    print(f"Starting Server from: {ROOT_DIR}")
    
    # --- MIGRATION GATE ---
    # In production, we need to ensure the DB schema is up to date before starting
    if os.getenv("RUN_MIGRATIONS", "True").lower() == "true":
        print("🚀 Running Database Migrations...")
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
        try:
            import django
            django.setup()
            from django.core.management import execute_from_command_line
            # Run migrate command
            execute_from_command_line([sys.argv[0], "migrate", "--noinput"])
            print("✅ Migrations Complete.")
        except Exception as e:
            print(f"⚠️ Migration Error: {e}")

    # Run Uvicorn
    # reload=False is safer here because uploading files to data/ 
    # would trigger a restart if reload was True.
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False  
    )
