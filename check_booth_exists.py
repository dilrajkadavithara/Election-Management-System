
import os
import django
import sys

# Setup Django Environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Booth, LocalBody

def check_booth():
    print("📋 System-wide Audit of Local Bodies & Booths:")
    lbs = LocalBody.objects.all()
    if not lbs.exists():
        print("❌ No Local Bodies found in the database.")
        return
        
    for lb in lbs:
        booth_count = lb.booths.count()
        booth_nums = list(lb.booths.values_list('number', flat=True))
        print(f"🏢 {lb.name} ({lb.body_type}): {booth_count} booths")
        if booth_nums:
            print(f"   🔢 Booths: {', '.join(booth_nums)}")
        else:
            print("   🔢 No booths assigned.")

if __name__ == "__main__":
    check_booth()
