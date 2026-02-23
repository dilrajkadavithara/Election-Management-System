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

def check_and_reset():
    username = 'admin'
    password = 'admin123' # or whatever the user wants
    
    user = User.objects.filter(username=username).first()
    if user:
        user.set_password(password)
        user.save()
        print(f"Password for '{username}' has been reset to '{password}'")
    else:
        print(f"User '{username}' does not exist.")
        all_users = [u.username for u in User.objects.all()]
        print(f"Available users: {all_users}")

if __name__ == "__main__":
    check_and_reset()
