
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
            constituency, _ = Constituency.objects.get_or_create(name=constituency_name.strip().upper())
            local_body, _ = LocalBody.objects.get_or_create(constituency=constituency, name=local_body_name.strip().upper(), body_type=local_body_type)

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
    from django.db.models import Count, Case, When, IntegerField, F, Value
    
    voters = user_profile.get_accessible_voters()
    if constituency_id:
        voters = voters.filter(booth__constituency_id=constituency_id)
    
    # Single GROUP BY query for all booth stats
    booth_agg = voters.values(
        'booth__id', 'booth__number', 'booth__polling_station_name', 'booth__name'
    ).annotate(
        total=Count('id'),
        udf=Count(Case(When(voter_leaning='UDF', then=1), output_field=IntegerField())),
        ldf=Count(Case(When(voter_leaning='LDF', then=1), output_field=IntegerField())),
        nda=Count(Case(When(voter_leaning='NDA', then=1), output_field=IntegerField())),
        neutral=Count(Case(When(voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
        intel_tagged=Count(Case(When(
            Q(voter_leaning__isnull=False) | Q(current_location__isnull=False) |
            Q(voting_probability__isnull=False) | Q(phone_no__isnull=False),
            then=1
        ), output_field=IntegerField())),
    ).order_by('booth__number')

    booth_stats = []
    for row in booth_agg:
        total = row['total']
        if total == 0:
            continue
        booth_stats.append({
            "id": row['booth__id'],
            "number": row['booth__number'],
            "name": row['booth__polling_station_name'] or row['booth__name'] or f"Booth {row['booth__number']}",
            "total": total,
            "udf": row['udf'],
            "ldf": row['ldf'],
            "nda": row['nda'],
            "neutral": row['neutral'],
            "coverage": round((row['intel_tagged'] / total) * 100, 1) if total > 0 else 0
        })
        
    # Recent activity — use select_related to avoid N+1 on booth/user
    recent_activity = []
    recent_voters = voters.select_related('booth', 'created_by').order_by('-updated_at')[:8]
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
    from django.db.models import Count, Case, When, IntegerField, Value
    
    voters = user_profile.get_accessible_voters()
    if constituency_id: voters = voters.filter(booth__constituency_id=constituency_id)
    if lb_id: voters = voters.filter(booth__local_body_id=lb_id)
    if booth_id: voters = voters.filter(booth_id=booth_id)
    
    # Single aggregated query for ALL counts
    stats = voters.aggregate(
        total=Count('id'),
        # Gender
        male=Count(Case(When(gender__iexact='Male', then=1), output_field=IntegerField())),
        female=Count(Case(When(gender__iexact='Female', then=1), output_field=IntegerField())),
        # Sentiment
        udf=Count(Case(When(voter_leaning='UDF', then=1), output_field=IntegerField())),
        ldf=Count(Case(When(voter_leaning='LDF', then=1), output_field=IntegerField())),
        nda=Count(Case(When(voter_leaning='NDA', then=1), output_field=IntegerField())),
        neutral=Count(Case(When(voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
        # Outreach
        with_phone=Count(Case(When(phone_no__isnull=False, then=Case(When(~Q(phone_no=''), then=1))), output_field=IntegerField())),
        # Age Distribution
        age_18_25=Count(Case(When(age__gte=18, age__lte=25, then=1), output_field=IntegerField())),
        age_26_40=Count(Case(When(age__gte=26, age__lte=40, then=1), output_field=IntegerField())),
        age_41_60=Count(Case(When(age__gte=41, age__lte=60, then=1), output_field=IntegerField())),
        age_60_plus=Count(Case(When(age__gt=60, then=1), output_field=IntegerField())),
        # Location
        loc_local=Count(Case(When(current_location='LOCAL', then=1), output_field=IntegerField())),
        loc_abroad=Count(Case(When(current_location='ABROAD', then=1), output_field=IntegerField())),
        loc_state=Count(Case(When(current_location='STATE', then=1), output_field=IntegerField())),
        loc_district=Count(Case(When(current_location='DISTRICT', then=1), output_field=IntegerField())),
        # Probability
        prob_confirmed=Count(Case(When(voting_probability='CONFIRMED', then=1), output_field=IntegerField())),
        prob_likely=Count(Case(When(voting_probability='LIKELY', then=1), output_field=IntegerField())),
        prob_unlikely=Count(Case(When(voting_probability='UNLIKELY', then=1), output_field=IntegerField())),
        prob_oos=Count(Case(When(voting_probability='OUT_OF_STATION', then=1), output_field=IntegerField())),
    )

    # Decisive set: single query for local + confirmed voters
    decisive = voters.filter(current_location='LOCAL', voting_probability='CONFIRMED').aggregate(
        total=Count('id'),
        udf=Count(Case(When(voter_leaning='UDF', then=1), output_field=IntegerField())),
        ldf=Count(Case(When(voter_leaning='LDF', then=1), output_field=IntegerField())),
        nda=Count(Case(When(voter_leaning='NDA', then=1), output_field=IntegerField())),
        neutral_d=Count(Case(When(voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
    )
    
    return {
        "total": stats['total'], 
        "gender": {"male": stats['male'], "female": stats['female']},
        "sentiment": {"UDF": stats['udf'], "LDF": stats['ldf'], "NDA": stats['nda'], "NEUTRAL": stats['neutral']},
        "outreach": {"with_phone": stats['with_phone']},
        "age_dist": {"18-25": stats['age_18_25'], "26-40": stats['age_26_40'], "41-60": stats['age_41_60'], "60+": stats['age_60_plus']},
        "location": {"LOCAL": stats['loc_local'], "ABROAD": stats['loc_abroad'], "STATE": stats['loc_state'], "DISTRICT": stats['loc_district']},
        "probability": {"CONFIRMED": stats['prob_confirmed'], "LIKELY": stats['prob_likely'], "UNLIKELY": stats['prob_unlikely'], "OUT_OF_STATION": stats['prob_oos']},
        "decisive_stats": {"total": decisive['total'], "UDF": decisive['udf'], "LDF": decisive['ldf'], "NDA": decisive['nda'], "NEUTRAL": decisive['neutral_d']},
        "tagging_progress": stats['total']
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
    c, created = Constituency.objects.get_or_create(name=name.strip().upper())
    return {"id": c.id, "name": c.name, "created": created}

def add_local_body(const_id, name, btype):
    c = Constituency.objects.get(id=const_id)
    lb, created = LocalBody.objects.get_or_create(constituency=c, name=name.strip().upper(), body_type=btype)
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
            p = u.profile
            users.append({
                "id": u.id,
                "username": u.username,
                "role": p.role,
                "can_download": p.can_download,
                "can_upload": p.can_upload,
                "can_verify": p.can_verify,
                "can_edit_voters": p.can_edit_voters,
                "can_send_broadcasts": p.can_send_broadcasts,
                "can_manage_system": p.can_manage_system,
                "assignments": {
                    "constituencies": list(p.assigned_constituencies.values_list('id', flat=True)),
                    "local_bodies": list(p.assigned_local_bodies.values_list('id', flat=True)),
                    "booths": list(p.assigned_booths.values_list('id', flat=True)),
                }
            })
    return users

def create_managed_user(username, password, role, assignments):
    from django.contrib.auth.models import User
    user = User.objects.create_user(username=username, password=password)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    # Save permissions from assignments dict
    if isinstance(assignments, dict):
        profile.can_download = assignments.get('can_download', False)
        profile.can_upload = assignments.get('can_upload', False)
        profile.can_verify = assignments.get('can_verify', True)
        profile.can_edit_voters = assignments.get('can_edit_voters', True)
        profile.can_send_broadcasts = assignments.get('can_send_broadcasts', False)
        profile.can_manage_system = assignments.get('can_manage_system', False)
    profile.save()
    # Save scope assignments
    if isinstance(assignments, dict):
        const_ids = assignments.get('constituencies', [])
        lb_ids = assignments.get('local_bodies', [])
        booth_ids = assignments.get('booths', [])
        if const_ids: profile.assigned_constituencies.set(const_ids)
        if lb_ids: profile.assigned_local_bodies.set(lb_ids)
        if booth_ids: profile.assigned_booths.set(booth_ids)
    return True, "User created"

def delete_user(user_id):
    from django.contrib.auth.models import User
    User.objects.get(id=user_id).delete()
    return True, "User deleted"

def update_user_profile(user_id, data):
    from django.contrib.auth.models import User
    user = User.objects.get(id=user_id)
    p = user.profile
    if 'role' in data: p.role = data['role']
    if 'can_download' in data: p.can_download = data['can_download']
    if 'can_upload' in data: p.can_upload = data['can_upload']
    if 'can_verify' in data: p.can_verify = data['can_verify']
    if 'can_edit_voters' in data: p.can_edit_voters = data['can_edit_voters']
    if 'can_send_broadcasts' in data: p.can_send_broadcasts = data['can_send_broadcasts']
    if 'can_manage_system' in data: p.can_manage_system = data['can_manage_system']
    p.save()
    # Update scope assignments if provided
    if 'assignments' in data and isinstance(data['assignments'], dict):
        a = data['assignments']
        if 'constituencies' in a: p.assigned_constituencies.set(a['constituencies'])
        if 'local_bodies' in a: p.assigned_local_bodies.set(a['local_bodies'])
        if 'booths' in a: p.assigned_booths.set(a['booths'])
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

