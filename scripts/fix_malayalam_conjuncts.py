"""
Fix Script: Reverse incorrect chillu conversions in conjuncts
This fixes names like സിൻധു -> സിന്ധു by detecting chillu + consonant patterns
"""

import os
import sys
import django
import re

# Setup Django
voter_vault_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voter_vault')
sys.path.insert(0, voter_vault_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter
from core.malayalam_normalizer import normalize_malayalam

def reverse_incorrect_chillu_conversions(text):
    """
    Reverse chillu characters that appear before consonants (incorrect conjuncts)
    സിൻധു -> സിന്ധു
    """
    if not text or text == "N/A":
        return text
    
    # Malayalam consonants range (excluding chillu range)
    # Consonants: \u0D15-\u0D39
    # Chillu: \u0D7A-\u0D7F
    
    # Reverse mapping: Chillu -> Consonant + Virama (when before another consonant)
    reverse_map = {
        'ൻ': 'ന്',  # Chillu N -> NA + Virama
        'ൺ': 'ണ്',  # Chillu NN -> NNA + Virama
        'ർ': 'ര്',  # Chillu R -> RA + Virama
        'ൽ': 'ല്',  # Chillu L -> LA + Virama
        'ൾ': 'ള്',  # Chillu LL -> LLA + Virama
        'ൿ': 'ക്',  # Chillu K -> KA + Virama
    }
    
    fixed = text
    
    # Replace chillu + consonant with proper conjunct
    for chillu, composite in reverse_map.items():
        # Pattern: chillu followed by a Malayalam consonant
        pattern = f'{re.escape(chillu)}(?=[\u0D15-\u0D39])'
        fixed = re.sub(pattern, composite, fixed)
    
    return fixed

def fix_malayalam_data():
    """Fix all incorrectly normalized Malayalam fields"""
    
    print("Starting Malayalam conjunct fix...")
    print("=" * 60)
    
    voters = Voter.objects.all()
    total_count = voters.count()
    
    print(f"Found {total_count} voters to process")
    
    updated_count = 0
    batch_size = 100
    
    for i, voter in enumerate(voters, 1):
        changed = False
        
        # Fix Full Name
        if voter.full_name:
            reversed_name = reverse_incorrect_chillu_conversions(voter.full_name)
            normalized_name = normalize_malayalam(reversed_name)
            if normalized_name != voter.full_name:
                voter.full_name = normalized_name
                changed = True
        
        # Fix Relation Name
        if voter.relation_name:
            reversed_relation = reverse_incorrect_chillu_conversions(voter.relation_name)
            normalized_relation = normalize_malayalam(reversed_relation)
            if normalized_relation != voter.relation_name:
                voter.relation_name = normalized_relation
                changed = True
        
        # Fix House Name
        if voter.house_name:
            reversed_house = reverse_incorrect_chillu_conversions(voter.house_name)
            normalized_house = normalize_malayalam(reversed_house)
            if normalized_house != voter.house_name:
                voter.house_name = normalized_house
                changed = True
        
        # Save if changed
        if changed:
            voter.save()
            updated_count += 1
        
        # Progress indicator
        if i % batch_size == 0:
            print(f"Processed {i}/{total_count} voters ({updated_count} fixed)")
    
    print("=" * 60)
    print(f"Fix complete!")
    print(f"Total voters processed: {total_count}")
    print(f"Voters fixed: {updated_count}")
    print(f"Voters unchanged: {total_count - updated_count}")

if __name__ == "__main__":
    try:
        fix_malayalam_data()
    except Exception as e:
        print(f"Error during fix: {e}")
        import traceback
        traceback.print_exc()
