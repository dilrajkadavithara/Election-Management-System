
import os
import django
import random
import sys

# Setup Django Environment (Manually pointing to settings)
sys.path.append('/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')

try:
    django.setup()
except Exception as e:
    print(f"Django Setup Warning: {e}")

from core_db.models import Voter

def random_phone():
    """Generates a realistic Indian mobile number."""
    prefix = random.choice(['9', '8', '7', '6'])
    rest = ''.join([str(random.randint(0, 9)) for _ in range(9)])
    return prefix + rest

def inject_demo_data(constituency_name=None, booth_number=None):
    """
    Injects realistic dummy data into 70% of voters.
    """
    print(f"\n--- INJECTING DEMO DATA (70% COVERAGE) ---")
    
    # Filter voters based on args
    query = Voter.objects.all()
    if constituency_name:
        query = query.filter(booth__constituency__name__icontains=constituency_name)
    if booth_number:
        query = query.filter(booth__number=booth_number)
        
    total_voters = query.count()
    if total_voters == 0:
        print("No voters found matching criteria.")
        return

    print(f"Targeting {total_voters} voters...")
    
    LEANING_OPTIONS = ['UDF', 'LDF', 'NDA', 'NEUTRAL']
    PROB_OPTIONS = ['CONFIRMED', 'LIKELY', 'UNLIKELY', 'OUT_OF_STATION']
    
    updated_count = 0
    
    # Batch update is faster, but random logic requires iteration
    for voter in query:
        # 30% Chance to skip (leave pristine)
        if random.random() > 0.70:
            continue

        modified = False

        # 1. Phone Number
        if not voter.phone_no:
            voter.phone_no = random_phone()
            modified = True
            
        # 2. Political Leaning (Weighted: UDF 40%, LDF 35%, NDA 15%, Neutral 10%)
        if not voter.voter_leaning:
            r = random.random()
            if r < 0.40: val = 'UDF'
            elif r < 0.75: val = 'LDF'
            elif r < 0.90: val = 'NDA'
            else: val = 'NEUTRAL'
            voter.voter_leaning = val
            modified = True

        # 3. Voting Probability
        if not voter.voting_probability:
            voter.voting_probability = random.choice(PROB_OPTIONS)
            modified = True
            
        if modified:
            voter.save()
            updated_count += 1
        
        if updated_count % 100 == 0:
            print(f"Processed {updated_count} voters...")

    print(f"\n✅ DONE! Injected data into {updated_count} voters ({updated_count/total_voters*100:.1f}% coverage).")
    print(f"The remaining {total_voters - updated_count} voters are untouched (Black/Uncaptured).")

if __name__ == "__main__":
    # Usage: python inject_demo_data.py [Constituency] [Booth]
    const = sys.argv[1] if len(sys.argv) > 1 else None
    booth = sys.argv[2] if len(sys.argv) > 2 else None
    inject_demo_data(const, booth)
