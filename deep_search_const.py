
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

def deep_search():
    print("--- Searching for any Constituency matching 'PARA' ---")
    consts = Constituency.objects.filter(name__icontains='PARA')
    
    if not consts.exists():
        print("No matches found locally.")
    else:
        for c in consts:
            v_count = Voter.objects.filter(booth__constituency=c).count()
            print(f"Found: '{c.name}' (ID: {c.id}) - Voters: {v_count}")

    print("\n--- All Current Constituencies ---")
    all_c = Constituency.objects.all()
    for c in all_c:
        print(f"- {c.name}")

if __name__ == "__main__":
    deep_search()
