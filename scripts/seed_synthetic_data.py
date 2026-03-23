"""
Synthetic Data Generator for IntelHub Demo
==========================================
Generates 200,000 realistic voters for NORTH PARAVOOR constituency.

Usage (run inside Docker container):
  docker compose -f docker-compose.remote.yml exec -T app python /app/scripts/seed_synthetic_data.py

Or via SSH:
  docker compose -f docker-compose.remote.yml exec -T app python -c "exec(open('/app/scripts/seed_synthetic_data.py').read())"
"""

import os, sys, random, string, time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
import django; django.setup()

from django.contrib.auth.models import User
from core_db.models import Constituency, LocalBody, Booth, Voter, UserProfile

# ============================================================
# CONFIGURATION
# ============================================================
CONSTITUENCY = "NORTH PARAVOOR"
LOCAL_BODIES = [
    "CHENNAMANGALAM", "EZHIKKARA", "PARAVOOR", "VADAKKEKKARA",
    "PUTHANVELIKKARA", "VARAPPUZHA", "KOTTUVALLY", "CHITTATTUKARA"
]
TOTAL_BOOTHS = 222
TOTAL_VOTERS = 200_000

# Ratios
GENDER_RATIO = {'F': 0.52, 'M': 0.48}
AGE_RANGES = [(18, 30, 0.25), (31, 50, 0.40), (51, 70, 0.25), (71, 95, 0.10)]
LEANING_RATIO = {'UDF': 0.38, 'LDF': 0.32, 'NDA': 0.15, 'NEUTRAL': 0.15}
LOCATION_RATIO = {'LOCAL': 0.90, 'ABROAD': 0.05, 'STATE': 0.02, 'DISTRICT': 0.03}
PROBABILITY_RATIO = {'CONFIRMED': 0.70, 'LIKELY': 0.15, 'UNLIKELY': 0.05, 'OUT_OF_STATION': 0.10}
HEAD_OF_FAMILY_RATIO = 0.30

# ============================================================
# MALAYALAM NAME DATA (Real Kerala names)
# ============================================================
MALE_FIRST = [
    "രാജേഷ്", "സുരേഷ്", "മനോജ്", "അനിൽ", "വിനോദ്", "സതീഷ്", "പ്രമോദ്", "ജയൻ",
    "മുഹമ്മദ്", "അബ്ദുൾ", "ഹരി", "കൃഷ്ണൻ", "ഗോപി", "രാമൻ", "സുനിൽ", "ബിജു",
    "ജോസഫ്", "തോമസ്", "ജോൺ", "ആൻ്റണി", "പ്രദീപ്", "ദിലീപ്", "ശ്രീകുമാർ", "ഉണ്ണി",
    "സജി", "ബാബു", "ശശി", "വിജയൻ", "നാരായണൻ", "പ്രസാദ്", "അജിത്", "രവി",
    "മോഹൻ", "ശങ്കർ", "ഗണേശ്", "ദിനേശ്", "പ്രവീൺ", "നവീൻ", "അരുൺ", "വിഷ്ണു",
    "സന്തോഷ്", "ജഗദീഷ്", "രാജീവ്", "അശോക്", "ഫൈസൽ", "ഷാജി", "ജോയ്", "മാത്യു",
    "കുര്യൻ", "ചാക്കോ", "ഇബ്രാഹിം", "യൂസഫ്", "സിദ്ദിഖ്", "റഷീദ്", "ഹസൻ", "അമീർ",
    "വേണു", "ഗിരീഷ്", "മധു", "ലാൽ", "സുധീർ", "കിരൺ", "നിഖിൽ", "ആദർശ്",
]

FEMALE_FIRST = [
    "ലക്ഷ്മി", "സരസ്വതി", "കമല", "മീന", "ശോഭ", "ജയ", "രാധ", "സുമ",
    "ഫാത്തിമ", "ആയിശ", "ഖദീജ", "മറിയം", "ആമിന", "സുഹ്റ", "നൂർജഹാൻ", "റഹ്മത്ത്",
    "മേരി", "ഏലിയാമ്മ", "ത്രേസ്യ", "ഗ്രേസി", "ലില്ലി", "റോസ", "ആനി", "സാറ",
    "ദേവി", "അമ്മു", "ശ്രീദേവി", "പാർവതി", "ഗീത", "രേഖ", "ശാന്ത", "ഉഷ",
    "സുജാത", "വിജയലക്ഷ്മി", "ഇന്ദിര", "ശാലിനി", "പ്രിയ", "ദീപ", "സ്മിത", "നിഷ",
    "അനിത", "രഞ്ജിനി", "ബിന്ദു", "ജ്യോതി", "നിർമല", "വിമല", "കവിത", "സരിത",
    "മിനി", "ലത", "സീന", "ജമീല", "നസീമ", "സൈന", "ഷീല", "റോസമ്മ",
    "സോഫിയ", "അന്ന", "ലീന", "രേണുക", "വനജ", "സുമതി", "അമൃത", "ഹരിത",
]

SURNAMES = [
    "നായർ", "മേനോൻ", "പിള്ള", "കുറുപ്പ്", "വർമ്മ", "പണിക്കർ", "ഉണ്ണിത്താൻ",
    "ജോസഫ്", "തോമസ്", "മാത്യു", "ചാക്കോ", "വർഗീസ്", "ഫിലിപ്പ്", "ഐപ്പ്",
    "ഹസൻ", "അഹമ്മദ്", "അലി", "ഖാൻ", "സയ്യിദ്", "ഷെയ്ഖ്",
    "ഗോവിന്ദൻ", "രാമചന്ദ്രൻ", "ശിവൻ", "മുരളീധരൻ", "ബാലകൃഷ്ണൻ",
    "കുട്ടി", "അമ്മ", "ദാസ്", "പ്രഭാകരൻ", "ചന്ദ്രൻ", "കുമാർ",
    "പോൾ", "ജേക്കബ്", "ഡേവിഡ്", "സൈമൺ", "ഈപ്പൻ",
]

HOUSE_NAMES = [
    "പുത്തൻപുരയ്ക്കൽ", "തെക്കേത്ത്", "വടക്കേത്ത്", "കിഴക്കേത്ത്", "പടിഞ്ഞാറേത്ത്",
    "മണിയിൽ", "പാറയിൽ", "തോട്ടത്തിൽ", "കുന്നത്ത്", "വയലിൽ",
    "നെല്ലിക്കൽ", "മാവിൽ", "പ്ലാവിൽ", "ആലിൽ", "തെങ്ങിൻകീഴിൽ",
    "പുതിയവീട്ടിൽ", "കരിമ്പനയ്ക്കൽ", "ചെറുവത്ത്", "എടത്ത്", "ഇടയ്ക്കൽ",
    "വളപ്പിൽ", "കാട്ടിൽ", "മുകളിൽ", "താഴെത്ത്", "നടുവിൽ",
    "പുളിക്കൽ", "ആറ്റിൽ", "കുളത്ത്", "ചിറയിൽ", "കടവിൽ",
    "വേലിൽ", "പറമ്പിൽ", "ചെമ്പകത്ത്", "കോടിയത്ത്", "മഠത്തിൽ",
    "പള്ളിയിൽ", "അമ്പലത്ത്", "ചാലിൽ", "കൊട്ടാരത്ത്", "മാളികയിൽ",
    "തറവാട്ടിൽ", "കാവിൽ", "ചേരിയിൽ", "പുരയിടത്ത്", "തൈക്കാട്ടിൽ",
]

POLLING_STATIONS = [
    "ഗവ. എൽ.പി. സ്കൂൾ", "ഗവ. യു.പി. സ്കൂൾ", "ഗവ. ഹൈസ്കൂൾ",
    "പഞ്ചായത്ത് കമ്മ്യൂണിറ്റി ഹാൾ", "ടൗൺ ഹാൾ", "ഗവ. ഓഫീസ്",
    "അംഗൻവാടി", "വായനശാല", "സാമൂഹ്യ ആരോഗ്യ കേന്ദ്രം",
    "ഗവ. വൊക്കേഷണൽ ഹയർ സെക്കൻഡറി സ്കൂൾ",
]

# ============================================================
# HELPER FUNCTIONS
# ============================================================
def weighted_choice(options_dict):
    """Pick from {option: probability} dict."""
    r = random.random()
    cumulative = 0
    for opt, prob in options_dict.items():
        cumulative += prob
        if r <= cumulative:
            return opt
    return list(options_dict.keys())[-1]

def random_age():
    """Pick age based on distribution."""
    r = random.random()
    cumulative = 0
    for low, high, prob in AGE_RANGES:
        cumulative += prob
        if r <= cumulative:
            return random.randint(low, high)
    return random.randint(18, 95)

def gen_epic_id():
    """Generate realistic EPIC ID like NPV1234567."""
    prefix = random.choice(["NPV", "EKM", "KRL", "VKD", "TCP", "IDK"])
    digits = ''.join(random.choices(string.digits, k=7))
    return prefix + digits

def gen_phone():
    """Generate realistic Indian phone number."""
    prefix = random.choice(["98", "97", "96", "95", "94", "93", "91", "90", "88", "87", "86", "85", "70", "73", "74", "75", "76", "77", "78", "79"])
    return prefix + ''.join(random.choices(string.digits, k=8))

def gen_house_no():
    """Generate realistic house number."""
    return str(random.randint(1, 999)) + random.choice(["", "", "", "/A", "/B", "/1", "/2"])

# ============================================================
# MAIN EXECUTION
# ============================================================
def run():
    print("\n" + "="*60)
    print("  IntelHub Synthetic Data Generator")
    print("  200,000 voters for NORTH PARAVOOR")
    print("="*60)

    # Check if data already exists
    existing = Voter.objects.filter(booth__constituency__name=CONSTITUENCY).count()
    if existing > 0:
        print(f"\n⚠️  Found {existing} existing voters in {CONSTITUENCY}.")
        print("   Skipping to avoid duplicates. Delete existing data first if you want to regenerate.")
        return

    start = time.time()

    # --- Step 1: Create Constituency ---
    print("\n📍 Creating constituency...")
    const, created = Constituency.objects.get_or_create(name=CONSTITUENCY, defaults={"code": "NPR"})
    print(f"   {'Created' if created else 'Exists'}: {const.name}")

    # --- Step 2: Create Local Bodies ---
    print("\n🏘️  Creating local bodies...")
    lb_objects = []
    for lb_name in LOCAL_BODIES:
        lb, created = LocalBody.objects.get_or_create(
            constituency=const, name=lb_name,
            defaults={"body_type": "PANCHAYAT"}
        )
        lb_objects.append(lb)
        print(f"   {'Created' if created else 'Exists'}: {lb.name}")

    # --- Step 3: Create Booths (22-28 per LB, total 222) ---
    print(f"\n📍 Creating {TOTAL_BOOTHS} booths...")
    booth_objects = []
    booth_counts = []
    remaining = TOTAL_BOOTHS

    for i, lb in enumerate(lb_objects):
        if i == len(lb_objects) - 1:
            count = remaining
        else:
            count = random.randint(22, 28)
            count = min(count, remaining - (len(lb_objects) - i - 1) * 22)
            count = max(count, 22)
        remaining -= count
        booth_counts.append(count)

    booth_number = 1
    for lb, count in zip(lb_objects, booth_counts):
        for j in range(count):
            num_str = str(booth_number).zfill(3)
            ps_name = random.choice(POLLING_STATIONS) + f" {lb.name} - {booth_number}"
            booth, created = Booth.objects.get_or_create(
                constituency=const, number=num_str,
                defaults={
                    "local_body": lb,
                    "polling_station_name": ps_name,
                    "polling_station_no": num_str,
                }
            )
            booth_objects.append(booth)
            booth_number += 1
        print(f"   {lb.name}: {count} booths")

    print(f"   Total: {len(booth_objects)} booths created")

    # --- Step 4: Generate Voters ---
    print(f"\n👥 Generating {TOTAL_VOTERS:,} voters...")
    print("   This will take 10-15 minutes. Progress shown every 10,000 voters.\n")

    # Distribute voters across booths (roughly equal, ~900 per booth)
    voters_per_booth = [TOTAL_VOTERS // TOTAL_BOOTHS] * TOTAL_BOOTHS
    for i in range(TOTAL_VOTERS % TOTAL_BOOTHS):
        voters_per_booth[i] += 1

    batch_size = 5000
    voter_buffer = []
    total_created = 0
    used_epics = set()

    for booth_idx, (booth, num_voters) in enumerate(zip(booth_objects, voters_per_booth)):
        for serial in range(1, num_voters + 1):
            # Gender
            gender = weighted_choice(GENDER_RATIO)

            # Name
            if gender == 'M':
                first = random.choice(MALE_FIRST)
            else:
                first = random.choice(FEMALE_FIRST)
            surname = random.choice(SURNAMES)
            full_name = f"{first} {surname}"

            # EPIC ID (ensure unique)
            epic = gen_epic_id()
            while epic in used_epics:
                epic = gen_epic_id()
            used_epics.add(epic)

            # Age
            age = random_age()

            # Intel data
            leaning = weighted_choice(LEANING_RATIO)
            location = weighted_choice(LOCATION_RATIO)
            probability = weighted_choice(PROBABILITY_RATIO)
            is_head = random.random() < HEAD_OF_FAMILY_RATIO

            # Phone (70% have phone numbers)
            phone = gen_phone() if random.random() < 0.70 else None

            # Relation
            if gender == 'F' and age > 25 and random.random() < 0.5:
                rel_type = "Husband"
                rel_name = f"{random.choice(MALE_FIRST)} {surname}"
            elif age < 30:
                rel_type = "Father"
                rel_name = f"{random.choice(MALE_FIRST)} {surname}"
            else:
                rel_type = random.choice(["Father", "Mother", "Husband", "Wife"])
                if rel_type in ("Father", "Husband"):
                    rel_name = f"{random.choice(MALE_FIRST)} {surname}"
                else:
                    rel_name = f"{random.choice(FEMALE_FIRST)} {surname}"

            voter_buffer.append(Voter(
                booth=booth,
                serial_no=serial,
                epic_id=epic,
                full_name=full_name,
                relation_type=rel_type,
                relation_name=rel_name,
                house_no=gen_house_no(),
                house_name=random.choice(HOUSE_NAMES),
                age=age,
                gender=gender,
                phone_no=phone,
                is_head_of_family=is_head,
                is_digitized=True,
                current_location=location,
                voter_leaning=leaning,
                voting_probability=probability,
                has_voted=False,
                source_file="SYNTHETIC_DEMO_DATA",
                original_serial=str(serial),
                status='VERIFIED',
            ))

            if len(voter_buffer) >= batch_size:
                Voter.objects.bulk_create(voter_buffer, ignore_conflicts=True)
                total_created += len(voter_buffer)
                elapsed = time.time() - start
                rate = total_created / elapsed
                eta = (TOTAL_VOTERS - total_created) / rate if rate > 0 else 0
                print(f"   ✅ {total_created:>7,} / {TOTAL_VOTERS:,} ({total_created*100//TOTAL_VOTERS}%) — {rate:.0f} voters/sec — ETA: {eta:.0f}s")
                voter_buffer = []

    # Final flush
    if voter_buffer:
        Voter.objects.bulk_create(voter_buffer, ignore_conflicts=True)
        total_created += len(voter_buffer)

    elapsed = time.time() - start
    print(f"\n   🎉 Done! {total_created:,} voters created in {elapsed:.1f}s ({total_created/elapsed:.0f}/sec)")

    # --- Step 5: Create Demo Users ---
    print("\n👤 Creating demo users...")

    demo_users = [
        {"username": "demo_admin", "password": "demo2026", "role": "SUPERUSER", "full_name": "Demo Admin"},
        {"username": "demo_manager", "password": "demo2026", "role": "MANAGER", "full_name": "Demo Manager"},
    ]

    # Create 2 booth agents for first 2 booths
    for i in range(2):
        demo_users.append({
            "username": f"booth_{i+1}", "password": "booth2026",
            "role": "BOOTH_AGENT", "full_name": f"Booth Agent {i+1}",
            "booth_idx": i,
        })

    for u in demo_users:
        user, created = User.objects.get_or_create(username=u["username"])
        if created:
            user.set_password(u["password"])
            user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = u["role"]
        profile.full_name = u.get("full_name", "")
        if u["role"] == "SUPERUSER":
            profile.can_download = True
            profile.can_upload = True
            profile.can_verify = True
            profile.can_edit_voters = True
            profile.can_send_broadcasts = True
            profile.can_manage_system = True
        elif u["role"] == "MANAGER":
            profile.can_download = True
            profile.can_upload = True
            profile.can_verify = True
            profile.can_edit_voters = True
            profile.can_send_broadcasts = True
        profile.save()

        if u["role"] == "SUPERUSER" or u["role"] == "MANAGER":
            profile.assigned_constituencies.set([const])

        if "booth_idx" in u:
            profile.assigned_booths.set([booth_objects[u["booth_idx"]]])

        status = "Created" if created else "Exists"
        print(f"   {status}: {u['username']} ({u['role']})" + (f" → Booth {booth_objects[u['booth_idx']].number}" if "booth_idx" in u else ""))

    # --- Summary ---
    print("\n" + "="*60)
    print("  SUMMARY")
    print("="*60)
    print(f"  Constituency:  {CONSTITUENCY}")
    print(f"  Local Bodies:  {len(lb_objects)}")
    print(f"  Booths:        {len(booth_objects)}")
    print(f"  Voters:        {total_created:,}")
    print(f"  Time:          {elapsed:.1f}s")
    print(f"\n  Demo Logins:")
    print(f"    demo_admin / demo2026  (SUPERUSER)")
    print(f"    demo_manager / demo2026  (MANAGER)")
    print(f"    booth_1 / booth2026  (BOOTH_AGENT → Booth 001)")
    print(f"    booth_2 / booth2026  (BOOTH_AGENT → Booth 002)")
    print("="*60 + "\n")

if __name__ == "__main__":
    run()
else:
    run()
