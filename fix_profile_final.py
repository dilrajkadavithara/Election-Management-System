
import sys
# Ensure we can import from the project root
sys.path.append('/app')

from django.apps import apps
from django.contrib.auth import get_user_model

User = get_user_model()

try:
    # Use the correct model name 'UserProfile'
    UserProfile = apps.get_model('core_db', 'UserProfile')
    print("Found UserProfile model in 'core_db'")
except LookupError:
    print("Critial Error: UserProfile model not found! Checking apps...")
    for conf in apps.get_app_configs():
        for model in conf.get_models():
            if model.__name__ == 'UserProfile':
                print(f"Found UserProfile in app: {conf.label}")
                UserProfile = model
                break
    else:
        raise Exception("UserProfile model not found in any app!")

try:
    admin_user = User.objects.get(username='admin')
    
    # Check if profile exists (related_name='profile' on User)
    try:
        if admin_user.profile:
            print("Profile already exists!")
            # Ensure it has permissions
            p = admin_user.profile
            p.role = 'SUPERUSER'
            p.can_download = True
            p.can_upload = True
            p.can_verify = True
            p.can_edit_voters = True
            p.can_send_broadcasts = True
            p.can_manage_system = True
            p.save()
            print("Profile updated with SUPERUSER privileges.")
    except Exception: # RelatedObjectDoesNotExist or similar
        # Create profile
        p = UserProfile.objects.create(
            user=admin_user, 
            role='SUPERUSER',
            can_download=True,
            can_upload=True,
            can_verify=True,
            can_edit_voters=True,
            can_send_broadcasts=True,
            can_manage_system=True
        )
        print(f"SUCCESS: Created UserProfile for {admin_user.username}")

except User.DoesNotExist:
    print("User 'admin' not found!")
except Exception as e:
    print(f"Error: {e}")
