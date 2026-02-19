
from django.contrib.auth import get_user_model
User = get_user_model()

# Step 1: Nuke existing user
try:
    if User.objects.filter(username='admin').exists():
        User.objects.get(username='admin').delete()
        print("Existing 'admin' user deleted.")
    else:
        print("'admin' user does not exist.")
except Exception as e:
    print(f"Error deleting user: {e}")

# Step 2: Fresh start
try:
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')
    print("New 'admin' user created with password 'admin'.")
except Exception as e:
    print(f"Error creating user: {e}")
