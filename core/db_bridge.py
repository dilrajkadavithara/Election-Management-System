
import os
import django
import sys
from django.conf import settings
from django.db import transaction
from django.db.models import Q

# Setup Django Environment for standalone script usage
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')

if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, Booth, Constituency, LocalBody, PoliticalParty, UserProfile, MessageTemplate, CommunicationLog

def get_parties():
    """Fetch list of active political parties"""
    return list(PoliticalParty.objects.filter(is_active=True).values('id', 'name', 'short_label', 'symbol_image', 'primary_color', 'accent_gradient'))

def add_party(name, symbol_image, short_label="", primary_color="#000080", accent_gradient="linear-gradient(to bottom, #FF9933, #ffffff, #138808)"):
    """Create a new political party with branding"""
    p, created = PoliticalParty.objects.get_or_create(name=name)
    p.symbol_image = symbol_image
    p.short_label = short_label
    p.primary_color = primary_color
    p.accent_gradient = accent_gradient
    p.save()
    return {"id": p.id, "name": p.name, "created": created}

def get_constituencies():
    """Fetch list of constituency names for dropdown"""
    return list(Constituency.objects.values_list('name', flat=True))

def get_local_bodies(constituency_name=None):
    """Fetch list of local bodies for a constituency"""
    qs = LocalBody.objects.all()
    if constituency_name:
        qs = qs.filter(constituency__name=constituency_name)
    return list(qs.values('id', 'name', 'body_type'))

def check_booth_exists(constituency_name, booth_number):
    """Verifies if a booth already has voters"""
    return Booth.objects.filter(constituency__name=constituency_name, number=str(booth_number)).exists()

def save_booth_data(constituency_name, local_body_type, local_body_name, booth_number, voter_data_list, original_filename, polling_station_no="", polling_station_name="", user_id=None):
    try:
        with transaction.atomic():
            constituency, _ = Constituency.objects.get_or_create(name=constituency_name)
            local_body, _ = LocalBody.objects.get_or_create(constituency=constituency, name=local_body_name, body_type=local_body_type)

            booth, created = Booth.objects.get_or_create(
                constituency=constituency,
                number=booth_number,
                defaults={
                    'local_body': local_body,
                    'polling_station_no': polling_station_no,
                    'polling_station_name': polling_station_name,
                    'name': polling_station_name or f"Booth {booth_number}"
                }
            )
            
            # Update PS Info if it was an existing booth but PS info is now provided
            if not created:
                if polling_station_no: booth.polling_station_no = polling_station_no
                if polling_station_name: 
                    booth.polling_station_name = polling_station_name
                    booth.name = polling_station_name
                booth.local_body = local_body
                booth.save()
            
            from django.contrib.auth.models import User
            created_by_user = None
            if user_id:
                try: created_by_user = User.objects.get(id=user_id)
                except: pass
            
            voters_to_create = []
            for row in voter_data_list:
                # Robust key extraction (handles both OCR Title Case and Frontend snake_case)
                def get_val(keys):
                    for k in keys:
                        if k in row and row[k] is not None: return row[k]
                    return None

                raw_age = get_val(['Age', 'age'])
                age_val = int(raw_age) if str(raw_age).isdigit() else None
                
                raw_serial = get_val(['Serial_OCR', 'serial_no', 'serial_number'])
                serial_val = int(raw_serial) if str(raw_serial).isdigit() else 0

                voter = Voter(
                    booth=booth,
                    serial_no=serial_val,
                    epic_id=get_val(['EPIC_ID', 'epic_id', 'EPIC ID']) or 'UNK',
                    full_name=get_val(['Full Name', 'full_name']) or 'N/A',
                    relation_type=get_val(['Relation Type', 'relation_type']) or '',
                    relation_name=get_val(['Relation Name', 'relation_name']) or '',
                    house_no=get_val(['House Number', 'house_no', 'House No']) or '',
                    house_name=get_val(['House Name', 'house_name']) or '',
                    age=age_val,
                    gender=get_val(['Gender', 'gender']) or '',
                    source_file=original_filename,
                    status='VERIFIED',
                    created_by=created_by_user
                )
                voters_to_create.append(voter)
            
            Voter.objects.bulk_create(voters_to_create)
            return True, f"Successfully saved {len(voters_to_create)} voters."

    except Exception as e:
        return False, f"Database Error: {str(e)}"

def get_strategic_analytics(user_profile, constituency_id=None):
    """Deep analytics aggregation for Command Center V2"""
    voters = user_profile.get_accessible_voters()
    if constituency_id:
        voters = voters.filter(booth__constituency_id=constituency_id)
        
    # Get relevant booths
    if constituency_id:
        booths = Booth.objects.filter(constituency_id=constituency_id).order_by('number')
    else:
        # If no constituency, get all booths accessible to user
        from django.db.models import Subquery
        booths = Booth.objects.filter(id__in=Subquery(voters.values('booth_id'))).order_by('constituency', 'number')
        
    booth_stats = []
    for b in booths:
        bvoters = voters.filter(booth=b)
        total = bvoters.count()
        if total == 0: continue
        
        udf = bvoters.filter(voter_leaning='UDF').count()
        ldf = bvoters.filter(voter_leaning='LDF').count()
        nda = bvoters.filter(voter_leaning='NDA').count()
        leaning_neutral = bvoters.filter(voter_leaning='NEUTRAL').count()
        
        # Coverage: What percentage of voters have any intelligence tag or basic info update?
        intel_tagged = bvoters.filter(
            Q(voter_leaning__isnull=False) | 
            Q(current_location__isnull=False) | 
            Q(voting_probability__isnull=False) |
            Q(phone_no__isnull=False)
        ).distinct().count()
        
        booth_stats.append({
            "id": b.id,
            "number": b.number,
            "name": b.polling_station_name or b.name or f"Booth {b.number}",
            "total": total,
            "udf": udf,
            "ldf": ldf,
            "nda": nda,
            "neutral": leaning_neutral,
            "coverage": round((intel_tagged / total) * 100, 1) if total > 0 else 0
        })
        
    # Recent activity across these voters
    recent_activity = []
    recent_voters = voters.order_by('-updated_at')[:8]
    for rv in recent_voters:
        recent_activity.append({
            "voter_name": rv.full_name,
            "booth_no": rv.booth.number,
            "updated_at": rv.updated_at.isoformat(),
            "agent": rv.created_by.username if rv.created_by else "System"
        })
        
    return {
        "booth_stats": booth_stats,
        "recent_activity": recent_activity
    }

def get_dashboard_stats(user_profile, constituency_id=None, lb_id=None, booth_id=None):
    voters = user_profile.get_accessible_voters()
    if constituency_id: voters = voters.filter(booth__constituency_id=constituency_id)
    if lb_id: voters = voters.filter(booth__local_body_id=lb_id)
    if booth_id: voters = voters.filter(booth_id=booth_id)
        
    total = voters.count()
    
    # 1. Gender Split
    male = voters.filter(gender__iexact='Male').count()
    female = voters.filter(gender__iexact='Female').count()
    
    # 2. Voter Sentiment (Leaning)
    sentiment = {
        "UDF": voters.filter(voter_leaning='UDF').count(),
        "LDF": voters.filter(voter_leaning='LDF').count(),
        "NDA": voters.filter(voter_leaning='NDA').count(),
        "NEUTRAL": voters.filter(voter_leaning='NEUTRAL').count(),
    }
    
    # 3. Outreach (Data Readiness)
    outreach = {
        "with_phone": voters.filter(phone_no__isnull=False).exclude(phone_no='').count(),
    }
    
    # 4. Age Distribution
    age_dist = {
        "18-25": voters.filter(age__gte=18, age__lte=25).count(),
        "26-40": voters.filter(age__gte=26, age__lte=40).count(),
        "41-60": voters.filter(age__gte=41, age__lte=60).count(),
        "60+": voters.filter(age__gt=60).count(),
    }

    # 5. Geographical Logistics (Location)
    location = {
        "LOCAL": voters.filter(current_location='LOCAL').count(),
        "ABROAD": voters.filter(current_location='ABROAD').count(),
        "STATE": voters.filter(current_location='STATE').count(),
        "DISTRICT": voters.filter(current_location='DISTRICT').count(),
    }

    # 6. Voting Probability (Political Pulse)
    probability = {
        "CONFIRMED": voters.filter(voting_probability='CONFIRMED').count(),
        "LIKELY": voters.filter(voting_probability='LIKELY').count(),
        "UNLIKELY": voters.filter(voting_probability='UNLIKELY').count(),
        "OUT_OF_STATION": voters.filter(voting_probability='OUT_OF_STATION').count(),
    }

    # 7. Decisive Set (Local + Confirmed Presence) - The basis for Win Probability
    decisive_voters = voters.filter(current_location='LOCAL', voting_probability='CONFIRMED')
    decisive_stats = {
        "total": decisive_voters.count(),
        "UDF": decisive_voters.filter(voter_leaning='UDF').count(),
        "LDF": decisive_voters.filter(voter_leaning='LDF').count(),
        "NDA": decisive_voters.filter(voter_leaning='NDA').count(),
        "NEUTRAL": decisive_voters.filter(voter_leaning='NEUTRAL').count(),
    }
    
    return {
        "total": total, 
        "gender": {"male": male, "female": female},
        "sentiment": sentiment, 
        "outreach": outreach,
        "age_dist": age_dist,
        "location": location,
        "probability": probability,
        "decisive_stats": decisive_stats,
        "tagging_progress": voters.count() # Simplified for dashboard
    }

def get_voter_list(user_profile, search=None, page=1, page_size=50, constituency_id=None, lb_id=None, booth_id=None, gender=None, age_from=None, age_to=None, leaning=None, serial_from=None, serial_to=None, location=None):
    voters = user_profile.get_accessible_voters()
    
    if search:
        voters = voters.filter(Q(full_name__icontains=search) | Q(epic_id__icontains=search) | Q(house_name__icontains=search))
    
    if constituency_id: voters = voters.filter(booth__constituency_id=constituency_id)
    if lb_id: voters = voters.filter(booth__local_body_id=lb_id)
    if booth_id: voters = voters.filter(booth_id=booth_id)
    if gender: voters = voters.filter(gender__iexact=gender)
    if age_from: voters = voters.filter(age__gte=int(age_from))
    if age_to: voters = voters.filter(age__lte=int(age_to))
    if leaning: voters = voters.filter(voter_leaning=leaning)
    if location: voters = voters.filter(current_location=location)
    
    # Serial range filtering for Slip Design
    if serial_from: voters = voters.filter(serial_no__gte=int(serial_from))
    if serial_to: voters = voters.filter(serial_no__lte=int(serial_to))
    
    total_count = voters.count()
    start = (page - 1) * page_size
    voters_slice = voters.select_related('booth', 'booth__local_body', 'booth__constituency')[start:start+page_size]

    results = []
    for v in voters_slice:
        results.append({
            "id": v.id,
            "serial_no": v.serial_no,
            "full_name": v.full_name,
            "epic_id": v.epic_id,
            "gender": v.gender,
            "age": v.age,
            "relation_name": v.relation_name,
            "relation_type": v.relation_type,
            "house_name": v.house_name,
            "house_no": v.house_no,
            "phone_no": v.phone_no,
            "voter_leaning": v.voter_leaning,
            "current_location": v.current_location,
            "booth_no": v.booth.number,
            "booth_id": v.booth.id,
            "constituency": v.booth.constituency.name,
            "local_body": v.booth.local_body.name if v.booth.local_body else "N/A",
            "ps_name": v.booth.polling_station_name or v.booth.name or "N/A",
            "voting_probability": v.voting_probability
        })
    return {"total": total_count, "results": results}

def update_voter_in_db(voter_id, data):
    try:
        voter = Voter.objects.get(id=voter_id)
        if 'full_name' in data: voter.full_name = data['full_name']
        if 'epic_id' in data: voter.epic_id = data['epic_id']
        if 'age' in data: voter.age = data['age']
        if 'gender' in data: voter.gender = data['gender']
        if 'phone_no' in data: voter.phone_no = data['phone_no']
        if 'voter_leaning' in data: voter.voter_leaning = data['voter_leaning']
        if 'current_location' in data: voter.current_location = data['current_location']
        if 'voting_probability' in data: voter.voting_probability = data['voting_probability']
        if 'house_no' in data: voter.house_no = data['house_no']
        if 'house_name' in data: voter.house_name = data['house_name']
        if 'relation_type' in data: voter.relation_type = data['relation_type']
        if 'relation_name' in data: voter.relation_name = data['relation_name']
        voter.save()
        return True, "Voter updated"
    except Exception as e: return False, str(e)

def get_all_locations(user_profile=None):
    data = []
    for c in Constituency.objects.all():
        c_node = {"id": c.id, "name": c.name, "local_bodies": []}
        for lb in c.local_bodies.all():
            lb_node = {"id": lb.id, "name": lb.name, "booths": []}
            for b in lb.booths.all():
                lb_node["booths"].append({
                    "id": b.id,
                    "number": b.number,
                    "ps_name": b.polling_station_name or "",
                    "ps_no": b.polling_station_no or ""
                })
            c_node["local_bodies"].append(lb_node)
        data.append(c_node)
    return data

def add_constituency(name):
    c, created = Constituency.objects.get_or_create(name=name)
    return {"id": c.id, "name": c.name, "created": created}

def add_local_body(const_id, name, btype):
    c = Constituency.objects.get(id=const_id)
    lb, created = LocalBody.objects.get_or_create(constituency=c, name=name, body_type=btype)
    return {"id": lb.id, "name": lb.name, "created": created}

def add_booth(const_id, lb_id, number, ps_name="", ps_no=""):
    num_str = str(number).zfill(3)
    b, created = Booth.objects.get_or_create(constituency_id=const_id, local_body_id=lb_id, number=num_str)
    if ps_name or ps_no:
        b.polling_station_name = ps_name
        b.polling_station_no = ps_no
        b.save()
    return {"id": b.id, "number": b.number, "created": created}

def get_all_users():
    from django.contrib.auth.models import User
    users = []
    for u in User.objects.all():
        if hasattr(u, 'profile'):
            users.append({"id": u.id, "username": u.username, "role": u.profile.role})
    return users

def create_managed_user(username, password, role, assignments):
    from django.contrib.auth.models import User
    user = User.objects.create_user(username=username, password=password)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.save()
    return True, "User created"

def delete_user(user_id):
    from django.contrib.auth.models import User
    User.objects.get(id=user_id).delete()
    return True, "User deleted"

def update_user_profile(user_id, data):
    from django.contrib.auth.models import User
    user = User.objects.get(id=user_id)
    if 'role' in data: user.profile.role = data['role']; user.profile.save()
    return True, "User updated"

def get_comm_stats(user_profile):
    """Retrieve communication performance metrics"""
    voters = user_profile.get_accessible_voters()
    voter_ids = voters.values_list('id', flat=True)
    logs = CommunicationLog.objects.filter(voter_id__in=voter_ids)
    
    return {
        "total_sent": logs.count(),
        "whatsapp": logs.filter(channel='WA').count(),
        "sms": logs.filter(channel='SMS').count(),
        "calls": logs.filter(channel='CALL').count(),
        "pending": logs.filter(status='PENDING').count(),
        "delivered": logs.filter(status='DELIVERED').count()
    }

def get_message_templates():
    """Fetch active message templates"""
    return list(MessageTemplate.objects.filter(is_active=True).values('id', 'name', 'msg_type', 'content'))

def create_comm_log(voter_id, template_id, channel, status='SENT'):
    """Record a communication event"""
    log = CommunicationLog.objects.create(
        voter_id=voter_id,
        template_id=template_id,
        channel=channel,
        status=status
    )
    return log.id

def get_filtered_war_stats(user_profile, constituency_id=None, lb_id=None, booth_id=None, 
                          gender=None, age_group=None, location=None, probability=None, perspective='UDF'):
    """
    Get highly specific War Room stats using dynamic filtering.
    Returns EXACT counts from the database, not approximations.
    """
    voters = user_profile.get_accessible_voters()
    
    # 1. Geography Filters - Hierarchical Priority
    if booth_id:
        voters = voters.filter(booth_id=booth_id)
    elif lb_id:
        voters = voters.filter(booth__local_body_id=lb_id)
    elif constituency_id:
        voters = voters.filter(booth__constituency_id=constituency_id)
    
    # 2. Demographic & Strategic Filters
    if gender and gender != 'ALL':
        voters = voters.filter(gender__iexact=gender)
        
    if age_group and age_group != 'ALL':
        if age_group == '18-25':
            voters = voters.filter(age__gte=18, age__lte=25)
        elif age_group == '26-40':
            voters = voters.filter(age__gte=26, age__lte=40)
        elif age_group == '41-60':
            voters = voters.filter(age__gte=41, age__lte=60)
        elif age_group == '60+':
            voters = voters.filter(age__gt=60)
            
    if location and location != 'ALL':
        # Special logic: 'LOCAL' is usually strict, others are broad
        voters = voters.filter(current_location=location)
        
    if probability and probability != 'ALL':
        voters = voters.filter(voting_probability=probability)
    else:
        # DEFAULT BASE: Only CONFIRMED voters count in the effective pool.
        # This excludes: undigitized (NULL), LIKELY, UNLIKELY, OUT_OF_STATION voters.
        # CONFIRMED = field-verified participation guarantee.
        voters = voters.filter(voting_probability='CONFIRMED')
        
    # 3. Calculate Metrics
    # Total voters matching ALL the criteria (The Denominator)
    total_matching_voters = voters.count()
    
    # Supporters within this specific group (The Numerator)
    # Note: If perspective is 'UDF', we count UDF supporters in this group
    supporter_count = voters.filter(voter_leaning=perspective).count()
    
    # Calculate simple probability
    prob = 0
    if total_matching_voters > 0:
        prob = round((supporter_count / total_matching_voters) * 100)
        
    return {
        "total_pool": total_matching_voters,
        "supporter_count": supporter_count,
        "probability": prob
    }

