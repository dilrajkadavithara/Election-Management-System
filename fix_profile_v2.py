
import sys
# Allow importing from current directory if needed
sys.path.append('/app')

from django.apps import apps
from django.contrib.auth import get_user_model

User = get_user_model()

try:
    # Based on settings.py, the app is 'core_db'
    Profile = apps.get_model('core_db', 'Profile')
    print("Found Profile model in 'core_db'")
except LookupError:
    print("Could not find Profile model in 'core_db'. Checking all apps...")
    for conf in apps.get_app_configs():
        # Check models in each app
        for model in conf.get_models():
            if model.__name__ == 'Profile':
                print(f"Found Profile in app: {conf.label}")
                Profile = model
                break
        else:
            continue
        break
    else:
        raise Exception("Profile model not found in any app!")

try:
    admin_user = User.objects.get(username='admin')
    
    # Check if profile exists
    # Use related_name 'profile' access or direct query
    if hasattr(admin_user, 'profile'):
        print("Profile already exists!")
    else:
        # Create profile
        # Note: Check fields required. Usually 'user' and 'role'.
        # I'll use 'role'='admin' based on previous logs.
        p = Profile.objects.create(user=admin_user, role='admin')
        print(f"SUCCESS: Created profile for {admin_user.username}")

except User.DoesNotExist:
    print("User 'admin' not found!")
except Exception as e:
    print(f"Error: {e}")
