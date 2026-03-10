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

users = User.objects.all().select_related('profile')
print(f"Total Users: {users.count()}")

for u in users:
    p = u.profile
    print(f"--- {u.username} ---")
    print(f"Role: {p.role}")
    print(f"Booths: {list(p.assigned_booths.values_list('id', flat=True))}")
    print(f"Constituencies: {list(p.assigned_constituencies.values_list('id', flat=True))}")
    print(f"Local Bodies: {list(p.assigned_local_bodies.values_list('id', flat=True))}")
