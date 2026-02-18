import os
import django
import sys

# Setup Django
sys.path.insert(0, str(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, str(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voter_vault')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, PoliticalParty, Constituency, Booth

print(f"Total Voters: {Voter.objects.count()}")
print(f"Total Parties: {PoliticalParty.objects.count()}")
print(f"Total Constituencies: {Constituency.objects.count()}")
print(f"Total Booths: {Booth.objects.count()}")
