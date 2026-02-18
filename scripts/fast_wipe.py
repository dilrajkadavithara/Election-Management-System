
import os
import sys
import django

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/voter_vault")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, CommunicationLog

print("Deleting Communication Logs...")
CommunicationLog.objects.all().delete()
print("Deleting Voters...")
Voter.objects.all().delete()
print("✅ ALL DATA WIPED.")
