import os
import django
import sys

# Setup paths
BASE_DIR = os.getcwd()
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.contrib.auth.models import User
from core_db.models import UserProfile

def dump_users():
    users = User.objects.all()
    print(f"Total Users: {users.count()}")
    for u in users:
        try:
            profile = u.profile
            print(f"User: {u.username}, Role: {profile.role}, Booths: {profile.assigned_booths.count()}, LBs: {profile.assigned_local_bodies.count()}")
        except UserProfile.DoesNotExist:
            print(f"User: {u.username}, No Profile")

if __name__ == "__main__":
    dump_users()
