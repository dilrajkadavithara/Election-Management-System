
import os
import sys
import django

# Setup path for the Django environment
if os.path.exists('/app/voter_vault'):
    sys.path.append('/app/voter_vault')
else:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(os.path.join(current_dir, 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Constituency, LocalBody, Booth, Voter, CommunicationLog

def clear_data_records():
    """
    Safely removes all DATA RECORDS while preserving the 
    database structure (Models/Tables) and User accounts.
    """
    print("--------------------------------------------------")
    print("🛡️  DATA-ONLY CLEARANCE INITIATED")
    print("--------------------------------------------------")
    
    try:
        # Records are removed in sequence to handle relationships
        
        # 1. Clear Voter Data & Communication Logs
        comm_count = CommunicationLog.objects.count()
        voter_count = Voter.objects.count()
        CommunicationLog.objects.all().delete()
        Voter.objects.all().delete()
        print(f"✅ REMOVED: {comm_count} Comm Logs")
        print(f"✅ REMOVED: {voter_count} Voter Entries")

        # 2. Clear Location Infrastructure Data
        booth_count = Booth.objects.count()
        lb_count = LocalBody.objects.count()
        const_count = Constituency.objects.count()

        Booth.objects.all().delete()
        LocalBody.objects.all().delete()
        Constituency.objects.all().delete()

        print(f"✅ REMOVED: {booth_count} Booths")
        print(f"✅ REMOVED: {lb_count} Local Bodies")
        print(f"✅ REMOVED: {const_count} Constituencies")
        
        print("--------------------------------------------------")
        print("✨ SUCCESS: Database content is now empty.")
        print("🔧 TABLES & MODELS REMAIN INTACT.")
        print("--------------------------------------------------")

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    clear_data_records()
