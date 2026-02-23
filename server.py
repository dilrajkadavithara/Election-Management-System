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
    
    # --- DEPLOYMENT GATES ---
    # In production, we need to ensure the DB schema is up to date and static files are collected
    if os.getenv("RUN_MIGRATIONS", "True").lower() == "true":
        print("🚀 Running Deployment Gates (Migrations & Static)...")
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
        try:
            import django
            django.setup()
            from django.core.management import execute_from_command_line
            
            # 1. Run migrate command
            print("   - Applying database migrations...")
            execute_from_command_line([sys.argv[0], "migrate", "--noinput"])
            
            # 2. Run collectstatic
            print("   - Collecting static files...")
            execute_from_command_line([sys.argv[0], "collectstatic", "--noinput", "--clear"])
            
            print("✅ Deployment Gates Complete.")
        except Exception as e:
            print(f"⚠️ Deployment Gate Error: {e}")

    # Run Uvicorn PROD mode
    # reload=False is mandatory for production to prevent restarts on file uploads
    is_dev = os.getenv("DEV_MODE", "False").lower() == "true"
    
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=is_dev,
        proxy_headers=True,
        forwarded_allow_ips="*"  
    )
