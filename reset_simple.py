
from django.contrib.auth import get_user_model
User = get_user_model()

try:
    if User.objects.filter(username='admin').exists():
        u = User.objects.get(username='admin')
        u.set_password('admin')
        u.is_superuser = True
        u.is_staff = True
        u.save()
        print("SUCCESS: Admin password reset to 'admin'.")
    else:
        User.objects.create_superuser('admin', 'admin@example.com', 'admin')
        print("SUCCESS: Admin user created (pass: admin).")
except Exception as e:
    print(f"ERROR: {e}")
