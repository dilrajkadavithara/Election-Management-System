import os
import sys
import random

# Setup paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter
from django.db import transaction

def populate_dummy_data():
    voters = Voter.objects.all()
    total = voters.count()
    print(f"Populating dummy data for {total} voters...")

    leanings = ['UDF', 'LDF', 'NDA', 'NEUTRAL']
    leaning_weights = [0.35, 0.35, 0.20, 0.10]

    locations = ['LOCAL', 'ABROAD', 'STATE', 'DISTRICT']
    location_weights = [0.80, 0.10, 0.05, 0.05]

    batch_size = 1000
    for i in range(0, total, batch_size):
        batch = voters[i:i+batch_size]
        with transaction.atomic():
            for v in batch:
                # Generate a realistic-looking phone number
                v.phone_no = f"+91 {random.randint(7000, 9999)}{random.randint(100000, 999999)}"
                
                # Assign leaning based on weights
                v.voter_leaning = random.choices(leanings, weights=leaning_weights)[0]
                
                # Assign location based on weights
                v.current_location = random.choices(locations, weights=location_weights)[0]
                
                v.save()
        print(f"Processed {min(i + batch_size, total)}/{total}...")

if __name__ == "__main__":
    populate_dummy_data()
    print("Dummy data population complete! 🚀")
