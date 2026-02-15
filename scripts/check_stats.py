
import os
import sys
import django

# Setup Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.contrib.auth.models import User
from core.db_bridge import get_dashboard_stats

def check_stats():
    try:
        user = User.objects.get(username='admin')
        print(f"User: {user.username}, Role: {user.profile.role}")
        stats = get_dashboard_stats(user.profile)
        print("Stats:")
        print(stats)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_stats()
