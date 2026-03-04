import os, sys, django
sys.path.insert(0, '/app/voter_vault')
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth import authenticate

u = User.objects.filter(username="michael_mathew").first()
print("Found in DB:", u)

if u:
    print("Is Active:", u.is_active)
    print("Check Password 'pass':", u.check_password('pass'))

user = authenticate(username='michael_mathew', password='pass')
print("Authenticated via Django:", user)

if user:
    try:
        from core_db.models import UserProfile
        print("Profile Type:", type(user.profile))
        print("Role:", user.profile.role)
    except Exception as e:
        print("Error getting profile:", e)
