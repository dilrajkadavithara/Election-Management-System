import os
import sys
import django
import random
from datetime import datetime, timedelta

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'voter_vault'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "voter_vault.settings")
django.setup()

from core_db.models import Booth, DailyProgress

def populate_war_room():
    print("🚀 Populating War Room Tactical Tracking Data...")
    
    booths = Booth.objects.all()
    if not booths.exists():
        print("❌ No booths found. Run populate_full_demo.py first.")
        return

    # Clear existing data
    DailyProgress.objects.all().delete()
    print("🗑️ Cleared existing tactical data.")

    today = datetime.now().date()
    batch = []

    for booth in booths:
        # Starting point 30 days ago
        digitized = random.randint(300, 600)
        udf = random.randint(100, 200)
        ldf = random.randint(100, 200)
        nda = random.randint(50, 100)
        neutral = digitized - (udf + ldf + nda)
        
        for i in range(30, -1, -1):
            date = today - timedelta(days=i)
            
            # Daily activity
            new_dig = random.randint(5, 25)
            converts_udf = random.randint(2, 8)
            converts_ldf = random.randint(1, 5)
            converts_nda = random.randint(0, 3)
            
            # Update totals
            digitized += new_dig
            udf += converts_udf
            ldf += converts_ldf
            nda += converts_nda
            neutral = max(0, neutral + (new_dig - (converts_udf + converts_ldf + converts_nda)))
            
            win_prob = min(98, max(5, (udf / max(1, digitized)) * 100 + random.uniform(-2, 5)))

            batch.append(DailyProgress(
                booth=booth,
                date=date,
                digitized_total=digitized,
                udf_total=udf,
                ldf_total=ldf,
                nda_total=nda,
                neutral_total=neutral,
                new_digitized=new_dig,
                new_udf=converts_udf,
                new_ldf=converts_ldf,
                new_nda=converts_nda,
                winning_chance=round(win_prob, 2)
            ))

            if len(batch) >= 2000:
                DailyProgress.objects.bulk_create(batch)
                batch = []
        
        if booth.id % 50 == 0:
            print(f"✅ Processed {booth.id} booths...")

    if batch:
        DailyProgress.objects.bulk_create(batch)
    
    print(f"✨ Successfully generated tactical tracking data for {booths.count()} booths.")

if __name__ == "__main__":
    populate_war_room()
