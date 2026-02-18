
import os
import sys
import django

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.voter_vault.settings')
django.setup()

from core_db.models import Voter, Booth, CommunicationLog

def wipe_all():
    print("WARNING: This will delete ALL voter data, booth data, and communication logs.")
    confirm = input("Type 'DELETE' to confirm: ")
    
    if confirm == 'DELETE':
        print("Deleting Communication Logs...")
        count, _ = CommunicationLog.objects.all().delete()
        print(f"Deleted {count} logs.")
        
        print("Deleting Voters...")
        count, _ = Voter.objects.all().delete()
        print(f"Deleted {count} voters.")
        
        # Optional: Delete Booths if you want a truly clean slate
        # print("Deleting Booths...")
        # count, _ = Booth.objects.all().delete()
        # print(f"Deleted {count} booths.")
        
        print("\n✅ Database Cleaned Successfully.")
    else:
        print("Operation Cancelled.")

if __name__ == "__main__":
    wipe_all()
