import os
import django
import sys

# Setup paths
BASE_DIR = os.getcwd()
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import UserProfile, Booth, LocalBody

def list_all_assignments():
    print(f"{'Username':<25} | {'Role':<20} | {'Booths':<7} | {'Local Bodies':<12}")
    print("-" * 75)
    profiles = UserProfile.objects.all().order_by('role')
    for p in profiles:
        b_count = p.assigned_booths.count()
        lb_count = p.assigned_local_bodies.count()
        print(f"{p.user.username:<25} | {p.role:<20} | {b_count:<7} | {lb_count:<12}")

if __name__ == "__main__":
    list_all_assignments()
