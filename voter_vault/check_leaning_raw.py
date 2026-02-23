
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter

def check_leaning_raw():
    v = Voter.objects.filter(voter_leaning__isnull=False).first()
    if v:
        print(f"Leaning value: '{v.voter_leaning}'")
        print(f"Leaning type: {type(v.voter_leaning)}")
    else:
        print("No voters with leaning found.")

if __name__ == "__main__":
    check_leaning_raw()
