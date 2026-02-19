
import os
import django
import random
import sys

# Setup Django Environment
sys.path.append('/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')

try:
    django.setup()
except Exception as e:
    print(f"Django Setup Warning: {e}")

from core_db.models import Voter

def inject_demo_location(constituency_name=None, booth_number=None):
    print(f"\n--- INJECTING LOCATION & LEANING DATA (70% COVERAGE) ---")
    
    query = Voter.objects.all()
    if constituency_name:
        query = query.filter(booth__constituency__name__icontains=constituency_name)
    if booth_number:
        query = query.filter(booth__number=booth_number)
        
    total_voters = query.count()
    if total_voters == 0:
        return

    print(f"Refining {total_voters} voters...")
    
    # Location Probability Distribution (Typical Kerala profile)
    LOC_OPTIONS = ['LOCAL', 'ABROAD', 'STATE', 'DISTRICT']
    # Weights: Local 65%, Abroad 20%, District 10%, State 5%
    
    # Leaning Options including NEUTRAL
    LEANING_OPTIONS = ['UDF', 'LDF', 'NDA', 'NEUTRAL']
    
    updated_count = 0
    
    for voter in query:
        # Check if this voter was part of our "Demo Set" (has phone number)
        # Or simple 70% chance again to catch them
        if not voter.phone_no:
            # Skip uncaptured voters to maintain the "Black Gap" visual
            continue

        modified = False

        # 1. Current Location (If missing)
        if not voter.current_location:
            r = random.random()
            if r < 0.65: loc = 'LOCAL'
            elif r < 0.85: loc = 'ABROAD'     # High Gulf migration
            elif r < 0.95: loc = 'DISTRICT'
            else: loc = 'STATE'
            voter.current_location = loc
            modified = True

        # 2. Refine Leaning (Ensure Neutral is present)
        if not voter.voter_leaning:
            # Fallback if v2 missed it
            r = random.random()
            if r < 0.35: val = 'UDF'
            elif r < 0.65: val = 'LDF'
            elif r < 0.80: val = 'NDA'
            else: val = 'NEUTRAL' # 20%
            voter.voter_leaning = val
            modified = True
            
        if modified:
            voter.save()
            updated_count += 1
        
        if updated_count % 100 == 0:
            print(f"Updated {updated_count} locations...")

    print(f"\n✅ DONE! Location info added to {updated_count} voters.")

if __name__ == "__main__":
    const = sys.argv[1] if len(sys.argv) > 1 else None
    booth = sys.argv[2] if len(sys.argv) > 2 else None
    inject_demo_location(const, booth)
