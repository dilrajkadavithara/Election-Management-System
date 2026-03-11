import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Booth, UserProfile
from django.contrib.auth.models import User

def check_counts():
    booths_with_head = Booth.objects.exclude(head_name__isnull=True).exclude(head_name='').count()
    booths_with_phone = Booth.objects.exclude(head_phone__isnull=True).exclude(head_phone='').count()
    total_booths = Booth.objects.count()
    
    print(f"Total Booths: {total_booths}")
    print(f"Booths with head_name: {booths_with_head}")
    print(f"Booths with head_phone: {booths_with_phone}")
    
    assigned_booths = Booth.objects.filter(assigned_profiles__role='BOOTH_AGENT').distinct().count()
    print(f"Booths with assigned BOOTH_AGENT: {assigned_booths}")

if __name__ == "__main__":
    check_counts()
