import os
import django
import sys
import json
from datetime import date

# Setup paths
BASE_DIR = os.getcwd()
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core.db_bridge import get_war_room_tactical_stats
from core_db.models import UserProfile, Constituency

class DateEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)

def debug_json():
    np = Constituency.objects.filter(name__icontains='Paravur').first()
    up = UserProfile.objects.filter(role='SUPERUSER').first()
    
    # EXACT call the API makes
    res = get_war_room_tactical_stats(up, constituency_id=np.id, perspective='UDF')
    
    # Save to a file for me to read
    with open('api_response_debug.json', 'w') as f:
        json.dump(res, f, cls=DateEncoder, indent=4)
        
    print("API Response saved to api_response_debug.json")
    print(f"Summary: {res['summary'].get('digitized')} digitized")
    print(f"Performance Keys: {res['performance'].keys()}")
    print(f"Top Win Count: {len(res['performance']['top_win'])}")

if __name__ == "__main__":
    debug_json()
