
import os
import sys
import django

# Setup Paths - Mimicking db_bridge.py
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Constituency

def init_constituency():
    name = "Trippunithura"
    code = "TRP"
    
    obj, created = Constituency.objects.get_or_create(
        name=name,
        defaults={'code': code}
    )
    
    if created:
        print(f"✅ Created Constituency: {name} ({code})")
    else:
        print(f"ℹ️ Constituency already exists: {name}")

if __name__ == "__main__":
    init_constituency()
