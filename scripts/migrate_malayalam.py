"""
Migration Script: Normalize all existing Malayalam text to atomic chillu forms
Run this once to update all existing voter records in the database
"""

import os
import sys
import django

# Setup Django - adjust path to voter_vault directory
voter_vault_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voter_vault')
sys.path.insert(0, voter_vault_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter
from core.malayalam_normalizer import normalize_malayalam

def migrate_malayalam_data():
    """Normalize all Malayalam fields in existing voter records"""
    
    print("Starting Malayalam normalization migration...")
    print("=" * 60)
    
    # Get all voters
    voters = Voter.objects.all()
    total_count = voters.count()
    
    print(f"Found {total_count} voters to process")
    
    updated_count = 0
    batch_size = 100
    
    for i, voter in enumerate(voters, 1):
        changed = False
        
        # Normalize Full Name
        if voter.full_name:
            normalized_name = normalize_malayalam(voter.full_name)
            if normalized_name != voter.full_name:
                voter.full_name = normalized_name
                changed = True
        
        # Normalize Relation Name
        if voter.relation_name:
            normalized_relation = normalize_malayalam(voter.relation_name)
            if normalized_relation != voter.relation_name:
                voter.relation_name = normalized_relation
                changed = True
        
        # Normalize House Name
        if voter.house_name:
            normalized_house = normalize_malayalam(voter.house_name)
            if normalized_house != voter.house_name:
                voter.house_name = normalized_house
                changed = True
        
        # Save if changed
        if changed:
            voter.save()
            updated_count += 1
        
        # Progress indicator
        if i % batch_size == 0:
            print(f"Processed {i}/{total_count} voters ({updated_count} updated)")
    
    print("=" * 60)
    print(f"Migration complete!")
    print(f"Total voters processed: {total_count}")
    print(f"Voters updated: {updated_count}")
    print(f"Voters unchanged: {total_count - updated_count}")

if __name__ == "__main__":
    try:
        migrate_malayalam_data()
    except Exception as e:
        print(f"Error during migration: {e}")
        import traceback
        traceback.print_exc()
