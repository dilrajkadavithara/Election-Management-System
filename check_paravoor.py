
import os
import django
import sys

# Setup Django
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Constituency, Voter, Booth

def check_paravoor():
    print("--- Searching for 'PARAVOOR' ---")
    consts = Constituency.objects.filter(name__iexact='PARAVOOR')
    
    if not consts.exists():
        print("No Constituency found with name 'PARAVOOR'.")
        return

    for c in consts:
        print(f"Found Constituency: {c.name} (ID: {c.id})")
        booth_count = Booth.objects.filter(constituency=c).count()
        voter_count = Voter.objects.filter(booth__constituency=c).count()
        print(f"  - Booths: {booth_count}")
        print(f"  - Voters: {voter_count}")
        
        if voter_count > 0:
            sample_voters = Voter.objects.filter(booth__constituency=c)[:5]
            print("  - Sample Voters:")
            for v in sample_voters:
                print(f"    * {v.full_name} (EPIC: {v.epic_id}) - Booth {v.booth.number}")

if __name__ == "__main__":
    check_paravoor()
