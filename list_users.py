
import os
import django
import sys

# Setup Django Environment (Manually pointing to settings)
sys.path.append('/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')

try:
    django.setup()
except Exception as e:
    # If setup fails, we might be running in a context where settings are already configured or path is wrong
    print(f"Django Setup Warning: {e}")

from django.contrib.auth.models import User

try:
    from core_db.models import UserProfile
except ImportError:
    print("Could not import UserProfile. Listing basic users only.")
    UserProfile = None

print(f"\n{'USERNAME':<20} | {'ROLE':<25} | {'Active?'}")
print("-" * 60)

for u in User.objects.all().order_by('username'):
    role = "Unknown"
    if UserProfile and hasattr(u, 'profile'):
        role = u.profile.role
    elif u.is_superuser:
        role = "SUPERUSER (System)"
    
    status = "✅ Yes" if u.is_active else "❌ No"
    print(f"{u.username:<20} | {role:<25} | {status}")

print("-" * 60)
