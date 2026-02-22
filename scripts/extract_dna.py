import os
import sys
import django
import json
from collections import Counter

project_root = r'C:\Users\dilra\OneDrive\Desktop\Voterslist\voter_vault'
if project_root not in sys.path:
    sys.path.append(project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter

def extract_dna():
    print("🧬 Extracting Name DNA from 51,000 records...")
    voters = Voter.objects.all().values('full_name', 'gender', 'house_name', 'relation_name')
    
    male_names = []
    female_names = []
    house_names = []
    relations = []
    
    for v in voters:
        name = v['full_name'].strip()
        gender = v['gender'].upper() if v['gender'] else 'UNKNOWN'
        house = v['house_name'].strip()
        rel = v['relation_name'].strip()
        
        if gender == 'MALE':
            male_names.append(name)
        elif gender == 'FEMALE':
            female_names.append(name)
            
        if house and house != 'N/A':
            house_names.append(house)
        if rel and rel != 'N/A':
            relations.append(rel)

    dna = {
        "male_pool": list(set(male_names)),
        "female_pool": list(set(female_names)),
        "house_pool": list(set(house_names)),
        "relation_pool": list(set(relations))
    }
    
    output_path = r'C:\Users\dilra\OneDrive\Desktop\Voterslist\scripts\name_dna.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(dna, f, ensure_ascii=False, indent=2)
    
    print(f"✅ DNA Captured! Saved {len(dna['male_pool'])} male patterns, {len(dna['female_pool'])} female patterns, and {len(dna['house_pool'])} house patterns.")

if __name__ == "__main__":
    extract_dna()
