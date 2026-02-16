import os
import django
import sys

# Setup Django Environment
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.contrib.auth.models import User
from core_db.models import UserProfile

def create_initial_admin(username, password):
    user = User.objects.filter(username=username).first()
    if not user:
        user = User.objects.create_superuser(username=username, email='', password=password)
        print(f"Superuser {username} created successfully.")
    else:
        user.set_password(password)
        user.save()
        print(f"User {username} updated with new password.")
    
    profile, created = UserProfile.objects.get_or_create(user=user)
    profile.role = 'SUPERUSER'
    profile.can_download = True
    profile.save()
    print(f"Role set to SUPERUSER for {username}.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--user", default="admin")
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    
    create_initial_admin(args.user, args.password)
