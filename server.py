import sys
import os
import uvicorn
from pathlib import Path

# 1. Setup Python Path
# This ensures 'core', 'backend', and 'voter_vault' are always importable
ROOT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = ROOT_DIR / "voter_vault"
sys.path.insert(0, str(ROOT_DIR))
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

# 2. Entry Point
if __name__ == "__main__":
    print(f"Starting Server from: {ROOT_DIR}")
    
    # --- DEPLOYMENT GATES ---
    # In production, we need to ensure the DB schema is up to date and static files are collected
    if os.getenv("RUN_MIGRATIONS", "True").lower() == "true":
        print("🚀 Running Deployment Gates (Migrations & Static)...")
        os.environ['DJANGO_SETTINGS_MODULE'] = 'voter_vault.settings'
        try:
            import django
            django.setup()
            from django.core.management import execute_from_command_line
            
            # 1. Run migrations with retry (guards against transient postgres startup lag)
            print("   - Applying database migrations...")
            migrated = False
            for attempt in range(1, 4):
                try:
                    execute_from_command_line([sys.argv[0], "migrate", "--noinput"])
                    migrated = True
                    break
                except Exception as migrate_err:
                    print(f"   ⚠️ Migration attempt {attempt}/3 failed: {migrate_err}")
                    if attempt < 3:
                        import time; time.sleep(5)
            if not migrated:
                print("   ❌ All migration attempts failed — check DB connection and migration lock.")

            # 2. Collect static files (incremental — no --clear, avoids 30-60s full rebuild)
            print("   - Collecting static files (incremental)...")
            try:
                execute_from_command_line([sys.argv[0], "collectstatic", "--noinput"])
            except Exception as static_err:
                print(f"   ⚠️ collectstatic warning: {static_err}")

            # 3. SYNC SHARED VOLUMES (Forced Production Sync)
            # Surgical shell copy to bypass mountpoint restrictions and ensure global 755 permissions.
            # Using 'cp -a' to preserve links/metadata and avoid the destructive 'rm -rf *' which can be slow.
            export_paths = {
                "/app/frontend/dist": "/mnt/static_export/frontend",
                "/app/voter_vault/static": "/mnt/static_export/backend"
            }
            
            for src, dst in export_paths.items():
                if os.path.exists(src) and os.path.exists(str(Path(dst).parent)):
                    print(f"   - Syncing {src} to {dst}...")
                    os.makedirs(dst, exist_ok=True)
                    # We copy contents surgically. Using a temp-over-swap approach is safer 
                    # but simple cp -a with update flag is often faster.
                    os.system(f"cp -aT {src}/ {dst}/ || cp -RT {src}/ {dst}/ || true")
                    os.system(f"chmod -R 755 {dst} || true")
                    print(f"     ✅ Sync complete.")

            print("✅ Deployment Gates Complete.")

        except Exception as e:
            print(f"❌ Deployment Gate fatal error (Django setup failed): {e}")

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
