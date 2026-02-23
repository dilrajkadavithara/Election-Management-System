import os
import django
import sys

# Setup paths
BASE_DIR = os.getcwd()
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter

def check_exact_leanings():
    leanings = Voter.objects.values_list('voter_leaning', flat=True).distinct()
    for l in leanings:
        print(f"DEBUG: '{l}' (Length: {len(str(l))})")

if __name__ == "__main__":
    check_exact_leanings()
