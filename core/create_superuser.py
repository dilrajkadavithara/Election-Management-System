import os
import sys
import django

# Setup Django environment
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.contrib.auth.models import User

# Create superuser
username = 'admin'
email = 'admin@votersvault.local'
password = 'admin123'

if User.objects.filter(username=username).exists():
    print(f'ℹ️  User "{username}" already exists.')
else:
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f'✅ Superuser "{username}" created successfully!')
    print(f'   Username: {username}')
    print(f'   Password: {password}')
    print(f'   Email: {email}')
    print(f'\n⚠️  Please change the password after first login for security!')
