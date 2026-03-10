import os
import django
import sys
from pathlib import Path

# Setup Path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(BASE_DIR / 'voter_vault') not in sys.path:
    sys.path.insert(0, str(BASE_DIR / 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.contrib.auth.models import User

print("--- USER ASSIGNMENT AUDIT ---")
users = User.objects.select_related('profile').all()
for u in users:
    if hasattr(u, 'profile'):
        booths = u.profile.assigned_booths.all()
        if booths.exists() or u.profile.role == 'BOOTH_AGENT':
            booth_list = [f"{b.number}(ID:{b.id})" for b in booths]
            print(f"User: {u.username} | Role: {u.profile.role} | Assigned Booths: {booth_list or 'EMPTY'}")
