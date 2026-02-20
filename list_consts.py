
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

from core_db.models import Constituency

def list_consts():
    print("--- Listing All Constituencies ---")
    consts = Constituency.objects.all()
    if not consts.exists():
        print("No constituencies in database.")
    for c in consts:
        print(f"- {c.name} (ID: {c.id})")

if __name__ == "__main__":
    list_consts()
