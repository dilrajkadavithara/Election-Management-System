import os
import sys
import django
from django.db.models import Count

# Add the voter_vault directory to the python path
project_root = r'C:\Users\dilra\OneDrive\Desktop\Voterslist\voter_vault'
if project_root not in sys.path:
    sys.path.append(project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, Booth, LocalBody

def analyze():
    total = Voter.objects.count()
    print(f"--- Global Voter Stats ---")
    print(f"Total Voters: {total}")
    
    locations = Voter.objects.values('current_location').annotate(count=Count('id'))
    print("\nLocation Distribution:")
    for loc in locations:
        print(f"  {loc['current_location'] or 'Unknown'}: {loc['count']}")
        
    leanings = Voter.objects.values('voter_leaning').annotate(count=Count('id'))
    print("\nLeaning Distribution:")
    for lean in leanings:
        print(f"  {lean['voter_leaning'] or 'Unknown'}: {lean['count']}")

    print(f"\n--- Geography Stats ---")
    print(f"Constituencies: {Voter.objects.values('booth__constituency__name').distinct().count()}")
    print(f"Local Bodies: {LocalBody.objects.count()}")
    print(f"Booths: {Booth.objects.count()}")
    
    booths = Booth.objects.all()[:10]
    print("\nFirst 10 Booths:")
    for b in booths:
        print(f"  {b.number}: {b.name} ({b.constituency.name})")

if __name__ == "__main__":
    analyze()
