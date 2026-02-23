import os
import django
from django.db.models import Count, Q

import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = ROOT_DIR / "voter_vault"
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(PROJECT_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter

total = Voter.objects.count()
tagged = Voter.objects.filter(voter_leaning__isnull=False).count()
untagged = Voter.objects.filter(voter_leaning__isnull=True).count()

print(f"Total Voters: {total}")
print(f"Tagged Voters: {tagged}")
print(f"Untagged Voters: {untagged}")

# Break down by leaning
stats = Voter.objects.aggregate(
    udf=Count('id', filter=Q(voter_leaning='UDF')),
    ldf=Count('id', filter=Q(voter_leaning='LDF')),
    nda=Count('id', filter=Q(voter_leaning='NDA')),
    neutral=Count('id', filter=Q(voter_leaning='NEUTRAL')),
    none=Count('id', filter=Q(voter_leaning__isnull=True))
)
print("Breakdown:", stats)
