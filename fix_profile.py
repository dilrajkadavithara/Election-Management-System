
from django.contrib.auth import get_user_model
# Adjust imports based on where Profile is defined
# Assuming it is in 'backend.models' or similar. 
# I will check standard location first: usually 'core.models' or 'users.models' or 'backend.models'
# Previous context suggests 'core' or 'backend'.
# Let's try locating Profile first in safe way.

import sys
# Allow importing from current directory
sys.path.append('/app')

from django.apps import apps

User = get_user_model()

try:
    Profile = apps.get_model('backend', 'Profile') # Common in this project based on logs showing /app/backend/main.py
except LookupError:
    try:
        Profile = apps.get_model('core', 'Profile')
    except LookupError:
        print("Could not find Profile model. Listing apps...")
        for conf in apps.get_app_configs():
            print(f"- {conf.label}")
        raise

try:
    admin_user = User.objects.get(username='admin')
    
    # Check if profile exists
    if hasattr(admin_user, 'profile'):
        print("Profile already exists!")
    else:
        # Create profile
        p = Profile.objects.create(user=admin_user, role='admin') # Assuming 'role' key based on error log
        print(f"Created profile for {admin_user.username} with role 'admin'")

except User.DoesNotExist:
    print("User 'admin' not found! Please run creation script first.")
except Exception as e:
    print(f"Error creating profile: {e}")
