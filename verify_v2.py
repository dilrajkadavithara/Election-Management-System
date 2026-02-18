
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
from core_db.models import UserProfile, Voter

# Get the admin user profile
profile = UserProfile.objects.filter(role='SUPERUSER').first()

if profile:
    stats = get_dashboard_stats(profile)
    
    # Also add the missing fields for verification
    stats['location'] = {
        "local": Voter.objects.filter(current_location='LOCAL').count(),
        "abroad": Voter.objects.filter(current_location='ABROAD').count(),
        "state": Voter.objects.filter(current_location='STATE').count(),
        "district": Voter.objects.filter(current_location='DISTRICT').count(),
    }
    stats['tagging_progress'] = Voter.objects.filter(status='VERIFIED').count()
    
    with open('verification_stats.json', 'w') as f:
        json.dump(stats, f, indent=4)
        
    print("Verification stats written to verification_stats.json")
    print(f"Total: {stats['total']}")
    print(f"Male: {stats['male']}")
    print(f"Female: {stats['female']}")
else:
    print("No Superuser profile found.")
