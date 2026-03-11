import os
import sys
import django
import random
import string

# Add the project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Booth, UserProfile
from django.contrib.auth.models import User
from django.db import transaction

def migrate_booth_heads():
    booths = Booth.objects.exclude(head_name__isnull=True).exclude(head_name='')
    created_count = 0
    updated_count = 0
    
    print(f"Found {booths.count()} booths with head_name. Starting consolidation...")
    
    for booth in booths:
        with transaction.atomic():
            # Check if this booth already has an assigned BOOTH_AGENT
            existing_agent = UserProfile.objects.filter(role='BOOTH_AGENT', assigned_booths=booth).first()
            
            if existing_agent:
                # Sync info if missing
                changed = False
                if not existing_agent.full_name:
                    existing_agent.full_name = booth.head_name
                    changed = True
                if not existing_agent.phone_number:
                    existing_agent.phone_number = booth.head_phone
                    changed = True
                if changed:
                    existing_agent.save()
                    updated_count += 1
            else:
                # Create a new user for this booth
                b_num = str(booth.number).zfill(3)
                username = f"agent_{b_num}"
                
                if User.objects.filter(username=username).exists():
                    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
                    username = f"{username}_{suffix}"
                
                user = User.objects.create_user(
                    username=username,
                    password=f"Booth@{b_num}"
                )
                
                profile, created = UserProfile.objects.get_or_create(user=user)
                profile.role = 'BOOTH_AGENT'
                profile.full_name = booth.head_name
                profile.phone_number = booth.head_phone
                profile.can_verify = True
                profile.can_edit_voters = True
                profile.save()
                
                profile.assigned_booths.add(booth)
                created_count += 1

    print(f"Migration Complete!")
    print(f"New Users Created: {created_count}")
    print(f"Existing Users Updated: {updated_count}")

if __name__ == "__main__":
    migrate_booth_heads()
