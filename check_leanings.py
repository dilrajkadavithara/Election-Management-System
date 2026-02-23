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

def check_leanings():
    leanings = list(Voter.objects.values_list('voter_leaning', flat=True).distinct())
    print(f"Distinct Leanings in DB: {leanings}")
    
    # Check count for 'UDF'
    udf_count = Voter.objects.filter(voter_leaning='UDF').count()
    print(f"UDF Count: {udf_count}")
    
    # Check count for 'NEUTRAL'
    neutral_count = Voter.objects.filter(voter_leaning='NEUTRAL').count()
    print(f"NEUTRAL Count: {neutral_count}")

if __name__ == "__main__":
    check_leanings()
