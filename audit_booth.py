
import os
import django
import sys

# Setup Django Environment for Docker container
sys.path.insert(0, '/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Booth, Voter

def check_voter_fields():
    b = Booth.objects.get(id=9)
    voters = Voter.objects.filter(booth=b)
    
    locations = {}
    probs = {}
    
    for v in voters:
        loc = str(v.current_location)
        prob = str(v.voting_probability)
        locations[loc] = locations.get(loc, 0) + 1
        probs[prob] = probs.get(prob, 0) + 1
        
    print(f"\n--- FIELD AUDIT: Booth {b.number} ---")
    print(f"Location Distribution: {locations}")
    print(f"Probability Distribution: {probs}")

if __name__ == "__main__":
    check_voter_fields()
