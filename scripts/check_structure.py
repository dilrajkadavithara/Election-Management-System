import os
import sys
import django
import json
from django.db.models import Count

project_root = r'C:\Users\dilra\OneDrive\Desktop\Voterslist\voter_vault'
if project_root not in sys.path:
    sys.path.append(project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, Booth, LocalBody, Constituency

def get_stats():
    stats = {
        "constituencies": list(Constituency.objects.values('id', 'name')),
        "local_bodies": list(LocalBody.objects.values('id', 'name', 'constituency__name')),
        "voter_count": Voter.objects.count(),
        "booth_count": Booth.objects.count()
    }
    print(json.dumps(stats, indent=2))

if __name__ == "__main__":
    get_stats()
