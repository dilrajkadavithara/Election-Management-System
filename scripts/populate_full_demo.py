import os
import sys
import django
import random
import json
from datetime import datetime, timedelta
from pathlib import Path

# 1. SETUP DJANGO
# Dynamic path detection for cross-platform compatibility
SCRIPT_DIR = Path(__file__).resolve().parent
BASE_DIR = SCRIPT_DIR.parent
project_root = str(BASE_DIR / 'voter_vault')

if project_root not in sys.path:
    sys.path.append(project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, Booth, LocalBody, Constituency, UserProfile
from django.contrib.auth.models import User
import pandas as pd

# 2. PARAMETERS
TARGET_VOTERS = 200000
TARGET_BOOTHS = 250
CONSTITUENCY_NAME = "NORTH PARAVUR"

LOCAL_BODIES = [
    ("NORTH PARAVUR", "MUNICIPALITY"),
    ("CHENDAMANGALAM", "PANCHAYAT"),
    ("CHITTATUKARA", "PANCHAYAT"),
    ("EZHIKKARA", "PANCHAYAT"),
    ("KOTTUVALLY", "PANCHAYAT"),
    ("PUTHENVELIKKARA", "PANCHAYAT"),
    ("VARAPPUZHA", "PANCHAYAT"),
    ("VADAKKEKARA", "PANCHAYAT")
]

RATIOS = {
    "UDF": 0.34,
    "LDF": 0.30,
    "NDA": 0.09,
    "NEUTRAL": 0.27
}

LOCATION_GAP = 0.14 # 14% Non-Local

def generate_full_demo():
    print(f"🚀 Initializing the {TARGET_VOTERS} Voter Battle-Management Simulation...")
    
    # --- Step 1: Geometry Setup ---
    const, _ = Constituency.objects.get_or_create(name=CONSTITUENCY_NAME)
    
    lb_objs = []
    for name, btype in LOCAL_BODIES:
        lb, _ = LocalBody.objects.get_or_create(constituency=const, name=name, body_type=btype)
        lb_objs.append(lb)

    # --- Step 2: Booth Setup (Excel Import) ---
    print("📋 Importing Polling Stations from Excel...")
    excel_path = str(BASE_DIR / 'Paravur_Polling_Stations_list (1).xlsx')
    
    if not os.path.exists(excel_path):
        print(f"❌ ERROR: Excel file not found at {excel_path}")
        return

    df = pd.read_excel(excel_path)
    
    booth_count = 0
    assigned_booths = []
    
    # Reset existing geometry to ensure clean demo
    Booth.objects.filter(constituency=const).delete()

    for idx, row in df.iterrows():
        num = str(row['Booth No.']).zfill(3)
        ps_name = row['Polling Station Name (Malayalam)']
        
        # Distribute booths across LBs sequentially
        lb_idx = (booth_count // (len(df) // len(lb_objs) + 1)) % len(lb_objs)
        target_lb = lb_objs[lb_idx]
        
        b = Booth.objects.create(
            constituency=const,
            local_body=target_lb,
            number=num,
            polling_station_name=ps_name,
            name=ps_name
        )
        assigned_booths.append(b)
        booth_count += 1

    # Fill up to 250 if needed
    while booth_count < TARGET_BOOTHS:
        num = str(booth_count + 1).zfill(3)
        target_lb = lb_objs[booth_count % len(lb_objs)]
        b = Booth.objects.create(
            constituency=const,
            local_body=target_lb,
            number=num,
            name=f"Generated Unit {num}",
            polling_station_name=f"Unit Location {num}"
        )
        assigned_booths.append(b)
        booth_count += 1
        
    print(f"✅ Created {len(assigned_booths)} Booth Units.")

    # --- Step 3: DNA Emulation (Names) ---
    M_FIRST = ["Suresh", "Binoy", "Ratish", "Anil", "Pradeep", "Raghavan", "Venu", "Soman", "Rajesh", "Bijoy", "Manoj", "Ajayan", "Sarith", "Binu"]
    F_FIRST = ["Sunitha", "Bindu", "Deepa", "Saritha", "Latha", "Mini", "Sheela", "Preetha", "Remya", "Dhanya", "Maya", "Lini", "Kavitha", "Sindhu"]
    SURNAMES = ["Manjali", "Puthuval", "Chittattukara", "Kunnath", "Ezhara", "Pillai", "Nair", "Varghese", "K.P.", "M.R.", "T.S.", "Das", "Menon"]
    HOUSES = ["Sreenilayam", "Mangalath", "Puthuval", "Kizhakkevedu", "Padinjarethalaykkal", "Aswathy", "Karthika", "Gokulam", "Souparnika", "Vrindavan"]

    # Personnel Hierarchy Simulation
    for lb in lb_objs:
        leader_name = f"{random.choice(M_FIRST + F_FIRST)} {random.choice(SURNAMES)}"
        user, _ = User.objects.get_or_create(username=f"lb_head_{lb.name.lower().replace(' ', '_')}", defaults={'is_staff': False})
        user.set_password('demo123')
        user.save()
        prof, _ = UserProfile.objects.get_or_create(user=user)
        prof.role = 'LOCAL_BODY_HEAD'
        prof.assigned_local_bodies.set([lb])
        prof.save()

    print(f"🧬 Injecting {TARGET_VOTERS} Synthetic Profiles (Small batch processing for server stability)...")
    
    batch_size = 2000 # Reduced batch size for stability
    voters_to_create = []
    total_created = 0

    for i in range(TARGET_VOTERS):
        gender = random.choice(['MALE', 'FEMALE'])
        fname = random.choice(M_FIRST) if gender == 'MALE' else random.choice(F_FIRST)
        lname = random.choice(SURNAMES)
        house = random.choice(HOUSES)
        
        # Leaning Logic
        rand_val = random.random()
        if rand_val < RATIOS['UDF']: leaning = 'UDF'
        elif rand_val < (RATIOS['UDF'] + RATIOS['LDF']): leaning = 'LDF'
        elif rand_val < (RATIOS['UDF'] + RATIOS['LDF'] + RATIOS['NDA']): leaning = 'NDA'
        else: leaning = 'NEUTRAL'
        
        # Location Logic
        is_local = random.random() > LOCATION_GAP
        location = 'LOCAL' if is_local else random.choice(['ABROAD', 'STATE', 'DISTRICT'])
        
        is_digitized = random.random() < 0.92
        
        if location == 'LOCAL':
            prob = random.choice(['CONFIRMED', 'LIKELY', 'UNLIKELY']) if is_digitized else None
        else:
            prob = 'OUT_OF_STATION' if is_digitized else None

        v = Voter(
            booth=random.choice(assigned_booths),
            serial_no=(i % 1000) + 1,
            epic_id=f"EPIC{random.randint(1000000, 9999999)}",
            full_name=f"{fname} {lname}",
            gender=gender,
            age=random.randint(18, 90),
            house_name=house,
            house_no=str(random.randint(1, 500)) + random.choice(['', 'A', 'B', '/1']),
            voter_leaning=leaning if is_digitized else None,
            current_location=location if is_digitized else None,
            voting_probability=prob if is_digitized else None,
            phone_no=f"9{random.randint(100000000, 999999999)}" if is_digitized and random.random() < 0.8 else None,
            source_file="DEMO_PARAVUR_2026.pdf",
            status='VERIFIED'
        )
        voters_to_create.append(v)
        
        if len(voters_to_create) >= batch_size:
            Voter.objects.bulk_create(voters_to_create)
            total_created += len(voters_to_create)
            voters_to_create = []
            if total_created % 10000 == 0:
                print(f"   - {total_created} voters successfully injected.")

    # Create remaining
    if voters_to_create:
        Voter.objects.bulk_create(voters_to_create)
        total_created += len(voters_to_create)

    print(f"✨ DEMO COMPLETE! {total_created} Voters initialized.")

if __name__ == "__main__":
    # Safety Check: Deep scrub before rebuild
    print("🧹 Performing Deep Scrub of existing demo data...")
    const_to_clean = Constituency.objects.filter(name=CONSTITUENCY_NAME)
    if const_to_clean.exists():
        Voter.objects.filter(booth__constituency__in=const_to_clean).delete()
        Booth.objects.filter(constituency__in=const_to_clean).delete()
    
    generate_full_demo()
