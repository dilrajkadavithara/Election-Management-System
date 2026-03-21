import os
import django
import sys

# Setup Django
sys.path.insert(0, '/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, Constituency

print(f"Constituencies: {[c.name for c in Constituency.objects.all()]}")
if Voter.objects.exists():
    v = Voter.objects.first()
    print(f"Sample Voter Gender: '{v.gender}'")
    print(f"Sample Voter Age: {v.age}")
    print(f"Sample Voter Constituency: '{v.booth.constituency.name}'")
else:
    print("No voters found in DB.")
