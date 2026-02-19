
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

from core_db.models import Voter, PoliticalParty

def random_phone():
    """Generates a realistic Indian mobile number."""
    prefix = random.choice(['9', '8', '7', '6'])
    rest = ''.join([str(random.randint(0, 9)) for _ in range(9)])
    return prefix + rest

def random_lat_long(center_lat, center_long, radius_km=1.0):
    """Generates random coordinates within a radius of a center point."""
    import math
    radius_deg = radius_km / 111.0
    u = random.random()
    v = random.random()
    w = radius_deg * math.sqrt(u)
    t = 2 * math.pi * v
    x = w * math.cos(t)
    y = w * math.sin(t)
    # Adjust for latitude
    x_adj = x / math.cos(math.radians(center_lat))
    return center_lat + y, center_long + x_adj

def inject_demo_data(constituency_name=None, booth_number=None):
    """
    Injects realistic dummy data into 70% of voters.
    """
    print(f"\n--- INJECTING DEMO DATA (70% COVERAGE) ---")
    
    # Filter voters based on args
    query = Voter.objects.all()
    if constituency_name:
        query = query.filter(constituency=constituency_name)
    if booth_number:
        query = query.filter(booth_no=booth_number)
        
    total_voters = query.count()
    if total_voters == 0:
        print("No voters found matching criteria.")
        return

    print(f"Targeting {total_voters} voters...")
    
    # Fetch Parties
    parties = list(PoliticalParty.objects.all())
    # Default leaning distribution (Can be tweaked per booth for realism)
    # Give INC slightly higher weight for this demo? Or mix it up.
    # Let's say: INC 45%, CPIM 35%, BJP 15%, Others 5%
    # But wait, we only touch 70% of people.
    
    updated_count = 0
    
    # Define a center point for geolocation (e.g. Trippunithura center)
    # Lat: 9.9468, Long: 76.3479
    center_lat = 9.9468
    center_long = 76.3479

    for voter in query:
        # 30% Chance to skip (leave pristine)
        if random.random() > 0.70:
            continue

        # 1. Phone Number
        if not voter.phone:
            voter.phone = random_phone()
            
        # 2. Political Leaning
        # Weighted random choice
        if not voter.party_leaning and parties:
            # Simple random for now, or weights if we had party objects
            # Assuming parties exist. If not, skip.
            voter.party_leaning = random.choice(parties)

        # 3. Geolocation
        # Scatter within 1km
        lat, lon = random_lat_long(center_lat, center_long)
        voter.latitude = lat
        voter.longitude = lon
        
        # 4. Verification Status (optional)
        # Mark some as Verified to show progress bars
        if random.random() > 0.5:
            voter.is_verified = True

        voter.save()
        updated_count += 1
        
        if updated_count % 100 == 0:
            print(f"Processed {updated_count} voters...")

    print(f"\n✅ DONE! Injected data into {updated_count} voters ({updated_count/total_voters*100:.1f}% coverage).")
    print(f"The remaining {total_voters - updated_count} voters are untouched (Black/Uncaptured).")

if __name__ == "__main__":
    # If run directly, targeting ALL voters for demo simplicity unless args provided
    # Usage: python inject_demo_data.py [Constituency] [Booth]
    const = sys.argv[1] if len(sys.argv) > 1 else None
    booth = sys.argv[2] if len(sys.argv) > 2 else None
    inject_demo_data(const, booth)
