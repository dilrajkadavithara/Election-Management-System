
import os
import sys
import django

# Correct Path for Docker Container (/app -> voter_vault)
sys.path.append('/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, CommunicationLog

print("Starting wipe...")
c1, _ = CommunicationLog.objects.all().delete()
c2, _ = Voter.objects.all().delete()
print(f"✅ SUCCESS: Deleted {c2} Voters and {c1} Logs from SERVER.")
