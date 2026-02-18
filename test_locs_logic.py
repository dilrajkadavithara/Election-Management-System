import os, sys, django
from pathlib import Path
from asgiref.sync import async_to_sync

BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
sys.path.append(str(BASE_DIR / "voter_vault"))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.contrib.auth.models import User
from core.db_bridge import get_all_locations

def test_locations_logic(username):
    try:
        user = User.objects.get(username=username)
        print(f"User found: {user.username}")
        locs = get_all_locations(user.profile)
        print(f"Locations count: {len(locs)}")
        return locs
    except Exception as e:
        print(f"Logic Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Let's try to find an admin user to test with
    admin = User.objects.filter(is_superuser=True).first()
    if not admin:
        admin = User.objects.first()
    
    if admin:
        test_locations_logic(admin.username)
    else:
        print("No users found in DB")
