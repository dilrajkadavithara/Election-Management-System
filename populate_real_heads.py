import os
import django
import sys
import random

# Setup paths
BASE_DIR = os.getcwd()
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Booth, LocalBody

def populate_unique_heads():
    print("🧬 Injecting 250+ Unique Personnel (No overlap)...")
    
    FIRST_NAMES = [
        "Sreekumar", "Anitha", "Rajesh", "Binu", "Sarath", "Deepa", "Manoj", "Saritha", "Bijoy", "Sunil",
        "Latha", "Pradeep", "Bindu", "Raghavan", "Soman", "Venu", "Ajayan", "Remya", "Dhanya", "Maya",
        "Lini", "Kavitha", "Sindhu", "Ratish", "Suresh", "Binoy", "Anil", "Prasad", "Sudheer", "Ambili",
        "Sreejith", "Preethi", "Sreekanth", "Haritha", "Vishnu", "Indu", "Girish", "Manju", "Renjith", "Sruthi"
    ]
    LAST_NAMES = [
        "V.", "Kumari", "Pillai", "Manjali", "Chandran", "Nair", "K.P.", "Varghese", "George", "Das",
        "Madhavan", "S.", "N.", "P.G.", "Gopal", "K.", "Krishnan", "Sreekumar", "B.", "Mohan",
        "Menon", "Kurup", "Panicker", "Thampi", "Warrier", "Nambiar", "Jose", "Thomas", "Antony", "Paul"
    ]

    def generate_unique_people(count):
        people = set()
        while len(people) < count:
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            phone = f"9{random.randint(400000000, 999999999)}"
            people.add((name, phone))
        return list(people)

    # Calculate total needed: Booths + LBs
    booth_count = Booth.objects.count()
    lb_count = LocalBody.objects.count()
    total_needed = booth_count + lb_count
    
    pool = generate_unique_people(total_needed)
    print(f"✅ Generated pool of {len(pool)} unique identities.")

    # 1. Update Local Body Heads
    print("🏛️ Assigning Unique Local Body Heads...")
    lbs = LocalBody.objects.all()
    for lb in lbs:
        person = pool.pop()
        lb.head_name = person[0]
        lb.head_phone = person[1]
        lb.save()
    print(f"✅ Updated {lbs.count()} Local Bodies.")

    # 2. Update Booth Heads
    print("👤 Assigning Unique Booth Heads...")
    booths = Booth.objects.all()
    batch_count = 0
    for b in booths:
        person = pool.pop()
        b.head_name = person[0]
        b.head_phone = person[1]
        b.save()
        batch_count += 1
        if batch_count % 50 == 0:
            print(f"   - {batch_count} booths assigned unique heads...")
            
    print(f"✨ SUCCESS: Every Booth and Local Body now has a unique, non-duplicated head name and phone.")

if __name__ == "__main__":
    populate_unique_heads()
