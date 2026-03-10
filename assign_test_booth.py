import os
import django
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(BASE_DIR / 'voter_vault') not in sys.path:
    sys.path.insert(0, str(BASE_DIR / 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.contrib.auth.models import User
from core_db.models import Booth

username = 'admin_booth'
user = User.objects.get(username=username)
profile = user.profile

booth_ids = [20, 21, 22] # Adjust if IDs differ, but typically these are the first few
booths = Booth.objects.filter(id__in=booth_ids)

if booths.exists():
    profile.assigned_booths.set(booths)
    profile.save()
    print(f"SUCCESS: Assigned booths {list(booths.values_list('number', flat=True))} to {username}")
else:
    print("ERROR: Booths not found")
