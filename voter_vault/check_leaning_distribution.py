
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter
from django.db.models import Count

def check_leaning_distribution():
    leanings = Voter.objects.values('voter_leaning').annotate(count=Count('id'))
    print("Voter Leaning Distribution:")
    for l in leanings:
        print(f"  - '{l['voter_leaning']}': {l['count']}")

if __name__ == "__main__":
    check_leaning_distribution()
