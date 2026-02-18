
import os
import django
import sys

# Setup Django Environment
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(ROOT_DIR, 'voter_vault')

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.contrib.auth.models import User
from core_db.models import UserProfile

def reset_admin():
    print("🚀 Running Emergency Admin Reset...")
    try:
        # Get or Create Admin
        user, created = User.objects.get_or_create(username="admin")
        
        # Hard Reset Password
        user.set_password("admin")
        user.is_superuser = True
        user.is_staff = True
        user.save()
        
        # Ensure Profile Exists & Has Superuser Role
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = "SUPERUSER"
        profile.can_download = True
        profile.can_upload = True
        profile.can_verify = True
        profile.can_edit_voters = True
        profile.can_send_broadcasts = True
        profile.can_manage_system = True
        profile.save()
        
        print(f"✅ SUCCESS: User '{user.username}' reset. Password is now 'admin'")
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    reset_admin()
