import os
import django
import sys

# Setup paths
BASE_DIR = os.getcwd()
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Booth

def check_booths():
    booths = Booth.objects.all()
    count = 0
    for b in booths:
        if b.assigned_users.count() > 0:
            count += 1
            print(f"Booth {b.number} has head(s): {[u.user.username for u in b.assigned_users.all()]}")
    
    print(f"Total Booths mapped to heads: {count} / {booths.count()}")

if __name__ == "__main__":
    check_booths()
