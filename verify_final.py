
import os
import django
import sys
import json

# Setup Django
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, 'voter_vault'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core.db_bridge import get_dashboard_stats
from core_db.models import UserProfile

# Get the admin user profile
profile = UserProfile.objects.filter(role='SUPERUSER').first()

if profile:
    stats = get_dashboard_stats(profile)
    
    with open('final_verification.json', 'w') as f:
        json.dump(stats, f, indent=4)
        
    print("Final stats written to final_verification.json")
    print(f"Total: {stats.get('total')}")
    print(f"Male: {stats.get('male')}")
    print(f"Female: {stats.get('female')}")
    print(f"Location Keys: {list(stats.get('location', {}).keys())}")
    print(f"Sentiment Keys: {list(stats.get('sentiment', {}).keys())}")
else:
    print("No Superuser profile found.")
