import os
import sys
import django
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = ROOT_DIR / "voter_vault"
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(PROJECT_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.db.models import Max, Count
from core_db.models import Voter, Booth, LocalBody

# Check for a specific local body (Chendamangalam)
lb = LocalBody.objects.filter(name__icontains='Chendamangalam').first()
if lb:
    voters = Voter.objects.filter(booth__local_body=lb)
    stats = voters.aggregate(m=Max('serial_no'), t=Count('id'), tagged=Count('voter_leaning'))
    print(f"LB: {lb.name}")
    print(f"Max Serial: {stats['m']}")
    print(f"Total Count: {stats['t']}")
    print(f"Tagged Count: {stats['tagged']}")
    if stats['t'] > 0:
        print(f"Coverage (Tagged/Total): {round(stats['tagged']/stats['t']*100, 1)}%")
    else:
        print("No voters found in DB")
else:
    print("Chendamangalam not found")
