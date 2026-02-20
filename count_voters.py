import os, sys, django
sys.path.insert(0, '/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, Booth, LocalBody, Constituency

total = Voter.objects.count()
by_constituency = (
    Constituency.objects.annotate_voter_count()
    if hasattr(Constituency, 'annotate_voter_count')
    else None
)

print(f"\n=== VOTER COUNT REPORT ===")
print(f"Total Voters: {total}")
print(f"\nBy Constituency:")
for c in Constituency.objects.all():
    count = Voter.objects.filter(booth__constituency=c).count()
    print(f"  {c.name}: {count}")
