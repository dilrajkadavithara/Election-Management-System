import os
import sys
import json

# Setup paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core.db_bridge import get_voter_list
from core_db.models import UserProfile

profile = UserProfile.objects.first()
if not profile:
    print("No profiles found")
else:
    res = get_voter_list(profile, page_size=1)
    if res['results']:
        v = res['results'][0]
        print(f"Constituency: {v.get('constituency')}")
        print(f"Polling Station: {v.get('ps_name')}")
        print(f"Keys present: {list(v.keys())}")
    else:
        print("No voters found")
