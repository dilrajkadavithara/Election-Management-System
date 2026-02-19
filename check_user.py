
import os
import django
import sys

# Add the project directory to the sys.path
sys.path.append('/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')

try:
    django.setup()
except Exception as e:
    print(f"Django Setup Warning: {e}")

from django.contrib.auth.models import User

def check_user(username):
    try:
        user = User.objects.get(username=username)
        print(f"Username: {user.username}")
        print(f"Active: {user.is_active}")
        print(f"Last Login: {user.last_login}")
        print(f"Date Joined: {user.date_joined}")
    except User.DoesNotExist:
        print(f"User {username} does not exist.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        check_user(sys.argv[1])
    else:
        print("Please provide a username.")
