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

print("--- FULL AUDIT ---")
print(f"Total Booths in DB: {Booth.objects.count()}")
b165 = Booth.objects.filter(number='165').first()
if b165:
    print(f"Booth 165 EXISTS (ID:{b165.id}) in {b165.constituency.name}")
else:
    print("Booth 165 does NOT exist in DB")

print("\n--- ALL USERS ---")
for u in User.objects.all():
    profile = getattr(u, 'profile', None)
    role = profile.role if profile else "NO PROFILE"
    b_count = profile.assigned_booths.count() if profile else 0
    print(f"Username: {u.username} | Role: {role} | Assigned Booths: {b_count}")
