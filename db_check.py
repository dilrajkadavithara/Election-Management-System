
import os
import django
import sys

# Setup Django
sys.path.insert(0, str(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, str(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voter_vault')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter

m_count = Voter.objects.filter(gender__iexact='Male').count()
f_count = Voter.objects.filter(gender__iexact='Female').count()
total = Voter.objects.count()

print(f"--- DATABASE VERIFICATION ---")
print(f"Total Voters in DB: {total}")
print(f"Male Count in DB: {m_count}")
print(f"Female Count in DB: {f_count}")
print(f"Unique Genders: {list(Voter.objects.values_list('gender', flat=True).distinct())}")
