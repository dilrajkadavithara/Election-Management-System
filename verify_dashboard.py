
import os
import django
import sys
import json

# Setup Django
sys.path.insert(0, str(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, str(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voter_vault')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core.db_bridge import get_dashboard_stats
from core_db.models import UserProfile, Voter

# Get the admin user profile
profile = UserProfile.objects.filter(role='SUPERUSER').first()

if profile:
    stats = get_dashboard_stats(profile)
    print("ALL_STATS_JSON_START")
    print(json.dumps(stats))
    print("ALL_STATS_JSON_END")
    
    # Check raw database values
    print(f"MALE_COUNT:{Voter.objects.filter(gender__iexact='Male').count()}")
    print(f"FEMALE_COUNT:{Voter.objects.filter(gender__iexact='Female').count()}")
    unique_genders = list(Voter.objects.values_list('gender', flat=True).distinct())
    print(f"GENDER_VALUES:{unique_genders}")
else:
    print("No Superuser profile found.")
