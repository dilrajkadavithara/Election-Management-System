import os
import django
import sys
import random

# Setup Django
sys.path.insert(0, '/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter

def update_heads():
    print("Identifying eligible male influencers in PARAVOOR...")
    
    # Selection from PARAVOOR
    eligible_voters = list(Voter.objects.filter(
        booth__constituency__name='PARAVOOR',
        gender__iexact='Male',
        age__gte=45
    ))
    
    total_eligible = len(eligible_voters)
    if total_eligible == 0:
        print("No eligible voters found. Check database.")
        return

    # Targeting 80%
    target_count = int(total_eligible * 0.8)
    heads_selected = random.sample(eligible_voters, target_count)

    print(f"Total Eligible Males (>45): {total_eligible}")
    print(f"Targeting: {target_count} for Influencer Segment (80%)")

    # Reset and update
    Voter.objects.filter(booth__constituency__name='PARAVOOR').update(is_head_of_family=False)
    
    update_ids = [v.id for v in heads_selected]
    batch_size = 5000
    for i in range(0, len(update_ids), batch_size):
        batch = update_ids[i:i + batch_size]
        Voter.objects.filter(id__in=batch).update(is_head_of_family=True)
        print(f"Processed {min(i + batch_size, len(update_ids))} voters...")

    print("Success: Final Influencer Segment is now populated.")

if __name__ == "__main__":
    update_heads()
