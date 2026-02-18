import os, sys, django
sys.path.append('voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()
from core.db_bridge import get_all_locations
from core_db.models import UserProfile
try:
    locs = get_all_locations()
    print(f"SUCCESS: Found {len(locs)} constituencies")
    for c in locs:
        print(f" - {c['name']} (LBs: {len(c['local_bodies'])})")
except Exception as e:
    print(f"ERROR: {e}")
