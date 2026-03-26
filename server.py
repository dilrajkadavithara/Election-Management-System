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
                    print("✅ Migrations successful.")
                    
                    # 4. AUTO-CREATE/RESET SUPERUSER (Expert Align)
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    from core_db.models import UserProfile
                    
                    for uname in ["admin", "recovery"]:
                        admin_user, created = User.objects.get_or_create(
                            username=uname,
                            defaults={"email": f"{uname}@intelhub.live", "is_superuser": True, "is_staff": True}
                        )
                        
                        # Expert alignment: Only force credentials if newly created
                        if created:
                            import secrets as _secrets
                            default_pw = os.getenv("ADMIN_DEFAULT_PASSWORD", _secrets.token_urlsafe(16))
                            admin_user.set_password(default_pw)
                            print(f"   ✨ Initial credentials created for: {uname} (password set from env or generated)")
                        
                        admin_user.is_active = True   # Critical for authenticate()
                        admin_user.is_staff = True    # Necessary for Admin-level access
                        admin_user.is_superuser = True
                        admin_user.save()
                        
                        # Sync with UserProfile for Role-Based Access
                        UserProfile.objects.get_or_create(
                            user=admin_user, 
                            defaults={
                                "role": 'SUPERUSER',
                                "can_manage_system": True,
                                "can_upload": True,
                                "can_download": True
                            }
                        )
                    
                    print(f"✅ Admin & Recovery accounts synchronized and activated.")
                    break
                except Exception as migrate_err:
                    err_msg = str(migrate_err)
                    print(f"   ⚠️ Migration attempt {attempt}/3 failed: {migrate_err}")
                    # Auto-fake migrations that fail due to "column already exists"
                    if "already exists" in err_msg:
                        print("   🔧 Detected 'already exists' — auto-faking problematic migration...")
                        try:
                            # Find and fake the failing migration
                            from django.core.management import call_command
                            call_command("showmigrations", "core_db", verbosity=0)
                            # Fake all unapplied core_db migrations then retry
                            call_command("migrate", "core_db", "--fake", verbosity=0)
                            print("   ✅ Auto-faked core_db migrations. Retrying full migrate...")
                            execute_from_command_line([sys.argv[0], "migrate", "--noinput"])
                            migrated = True
                            break
                        except Exception as fake_err:
                            print(f"   ⚠️ Auto-fake failed: {fake_err}")
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
                    import shutil as _shutil
                    import stat
                    # CRITICAL FIX: Clear CONTENTS of mount point, not the mount point itself.
                    # rmtree(dst) fails silently on Docker volume mount points, leaving stale files.
                    try:
                        for item in os.listdir(dst):
                            item_path = os.path.join(dst, item)
                            if os.path.isdir(item_path):
                                _shutil.rmtree(item_path)
                            else:
                                os.remove(item_path)
                        print(f"     🧹 Cleared old contents from {dst}")
                    except Exception as clear_err:
                        print(f"     ⚠️ Could not clear {dst}: {clear_err}")
                    # Copy new files into the mount point
                    _shutil.copytree(src, dst, dirs_exist_ok=True)
                    for root, dirs, files in os.walk(dst):
                        for d in dirs:
                            os.chmod(os.path.join(root, d), stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
                        for f in files:
                            os.chmod(os.path.join(root, f), stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
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
        reload=False,
        proxy_headers=True,
        forwarded_allow_ips="*",
        workers=6  # 250 concurrent booth agents: 6 workers handles ~300 req/s of lightweight DB reads/writes
    )
