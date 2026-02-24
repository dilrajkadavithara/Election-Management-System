
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
                    phone_no=get_val(['phone_no', 'Phone Number', 'Phone']),
                    voter_leaning=get_val(['voter_leaning', 'Leaning', 'Sentiment']),
                    current_location=get_val(['current_location', 'Location', 'Residence']),
                    voting_probability=get_val(['voting_probability', 'Probability', 'Chance']),
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
        h_name=F('booth__head_name'),
        h_phone=F('booth__head_phone'),
        total=Count('id'),
        udf=Count(Case(When(voter_leaning='UDF', then=1), output_field=IntegerField())),
        ldf=Count(Case(When(voter_leaning='LDF', then=1), output_field=IntegerField())),
        nda=Count(Case(When(voter_leaning='NDA', then=1), output_field=IntegerField())),
        neutral=Count(Case(When(voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
        intel_tagged=Count(Case(When(voter_leaning__isnull=False, then=1), output_field=IntegerField())),
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
            "head_name": row['h_name'],
            "head_phone": row['h_phone'],
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

def get_dashboard_stats(user_profile, constituency_id=None, lb_id=None, booth_id=None, gender=None, leaning=None, location=None):
    from django.db.models import Count, Case, When, IntegerField, Value
    
    voters = user_profile.get_accessible_voters()
    if constituency_id: voters = voters.filter(booth__constituency_id=constituency_id)
    if lb_id: voters = voters.filter(booth__local_body_id=lb_id)
    if booth_id: voters = voters.filter(booth_id=booth_id)
    if gender: voters = voters.filter(gender__iexact=gender)
    if leaning: voters = voters.filter(voter_leaning=leaning)
    if location: voters = voters.filter(current_location=location)
    
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
        
        # --- GRANULAR INTERSECTIONS ---
        # Gender / Leaning
        male_udf=Count(Case(When(gender__iexact='Male', voter_leaning='UDF', then=1), output_field=IntegerField())),
        male_ldf=Count(Case(When(gender__iexact='Male', voter_leaning='LDF', then=1), output_field=IntegerField())),
        male_nda=Count(Case(When(gender__iexact='Male', voter_leaning='NDA', then=1), output_field=IntegerField())),
        male_neu=Count(Case(When(gender__iexact='Male', voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
        female_udf=Count(Case(When(gender__iexact='Female', voter_leaning='UDF', then=1), output_field=IntegerField())),
        female_ldf=Count(Case(When(gender__iexact='Female', voter_leaning='LDF', then=1), output_field=IntegerField())),
        female_nda=Count(Case(When(gender__iexact='Female', voter_leaning='NDA', then=1), output_field=IntegerField())),
        female_neu=Count(Case(When(gender__iexact='Female', voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),

        # Age / Leaning
        age_18_25_udf=Count(Case(When(age__gte=18, age__lte=25, voter_leaning='UDF', then=1), output_field=IntegerField())),
        age_18_25_ldf=Count(Case(When(age__gte=18, age__lte=25, voter_leaning='LDF', then=1), output_field=IntegerField())),
        age_18_25_nda=Count(Case(When(age__gte=18, age__lte=25, voter_leaning='NDA', then=1), output_field=IntegerField())),
        age_18_25_neu=Count(Case(When(age__gte=18, age__lte=25, voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
        
        age_26_40_udf=Count(Case(When(age__gte=26, age__lte=40, voter_leaning='UDF', then=1), output_field=IntegerField())),
        age_26_40_ldf=Count(Case(When(age__gte=26, age__lte=40, voter_leaning='LDF', then=1), output_field=IntegerField())),
        age_26_40_nda=Count(Case(When(age__gte=26, age__lte=40, voter_leaning='NDA', then=1), output_field=IntegerField())),
        age_26_40_neu=Count(Case(When(age__gte=26, age__lte=40, voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),

        age_41_60_udf=Count(Case(When(age__gte=41, age__lte=60, voter_leaning='UDF', then=1), output_field=IntegerField())),
        age_41_60_ldf=Count(Case(When(age__gte=41, age__lte=60, voter_leaning='LDF', then=1), output_field=IntegerField())),
        age_41_60_nda=Count(Case(When(age__gte=41, age__lte=60, voter_leaning='NDA', then=1), output_field=IntegerField())),
        age_41_60_neu=Count(Case(When(age__gte=41, age__lte=60, voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),

        age_60_plus_udf=Count(Case(When(age__gt=60, voter_leaning='UDF', then=1), output_field=IntegerField())),
        age_60_plus_ldf=Count(Case(When(age__gt=60, voter_leaning='LDF', then=1), output_field=IntegerField())),
        age_60_plus_nda=Count(Case(When(age__gt=60, voter_leaning='NDA', then=1), output_field=IntegerField())),
        age_60_plus_neu=Count(Case(When(age__gt=60, voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),

        # Missing Votes (Intersections)
        mv_likely_udf=Count(Case(When(voting_probability='LIKELY', voter_leaning='UDF', then=1), output_field=IntegerField())),
        mv_likely_ldf=Count(Case(When(voting_probability='LIKELY', voter_leaning='LDF', then=1), output_field=IntegerField())),
        mv_likely_nda=Count(Case(When(voting_probability='LIKELY', voter_leaning='NDA', then=1), output_field=IntegerField())),
        mv_likely_neu=Count(Case(When(voting_probability='LIKELY', voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
        
        mv_unlikely_udf=Count(Case(When(voting_probability='UNLIKELY', voter_leaning='UDF', then=1), output_field=IntegerField())),
        mv_unlikely_ldf=Count(Case(When(voting_probability='UNLIKELY', voter_leaning='LDF', then=1), output_field=IntegerField())),
        mv_unlikely_nda=Count(Case(When(voting_probability='UNLIKELY', voter_leaning='NDA', then=1), output_field=IntegerField())),
        mv_unlikely_neu=Count(Case(When(voting_probability='UNLIKELY', voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
        
        mv_oos_udf=Count(Case(When(voting_probability='OUT_OF_STATION', voter_leaning='UDF', then=1), output_field=IntegerField())),
        mv_oos_ldf=Count(Case(When(voting_probability='OUT_OF_STATION', voter_leaning='LDF', then=1), output_field=IntegerField())),
        mv_oos_nda=Count(Case(When(voting_probability='OUT_OF_STATION', voter_leaning='NDA', then=1), output_field=IntegerField())),
        mv_oos_neu=Count(Case(When(voting_probability='OUT_OF_STATION', voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
        
        mv_abroad_udf=Count(Case(When(current_location='ABROAD', voter_leaning='UDF', then=1), output_field=IntegerField())),
        mv_abroad_ldf=Count(Case(When(current_location='ABROAD', voter_leaning='LDF', then=1), output_field=IntegerField())),
        mv_abroad_nda=Count(Case(When(current_location='ABROAD', voter_leaning='NDA', then=1), output_field=IntegerField())),
        mv_abroad_neu=Count(Case(When(current_location='ABROAD', voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
        
        mv_state_udf=Count(Case(When(current_location='STATE', voter_leaning='UDF', then=1), output_field=IntegerField())),
        mv_state_ldf=Count(Case(When(current_location='STATE', voter_leaning='LDF', then=1), output_field=IntegerField())),
        mv_state_nda=Count(Case(When(current_location='STATE', voter_leaning='NDA', then=1), output_field=IntegerField())),
        mv_state_neu=Count(Case(When(current_location='STATE', voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
        
        mv_district_udf=Count(Case(When(current_location='DISTRICT', voter_leaning='UDF', then=1), output_field=IntegerField())),
        mv_district_ldf=Count(Case(When(current_location='DISTRICT', voter_leaning='LDF', then=1), output_field=IntegerField())),
        mv_district_nda=Count(Case(When(current_location='DISTRICT', voter_leaning='NDA', then=1), output_field=IntegerField())),
        mv_district_neu=Count(Case(When(current_location='DISTRICT', voter_leaning='NEUTRAL', then=1), output_field=IntegerField())),
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
        "tagging_progress": stats['udf'] + stats['ldf'] + stats['nda'] + stats['neutral'],
        # Intersections
        "gender_split": {
            "Male": {"UDF": stats['male_udf'], "LDF": stats['male_ldf'], "NDA": stats['male_nda'], "NEUTRAL": stats['male_neu']},
            "Female": {"UDF": stats['female_udf'], "LDF": stats['female_ldf'], "NDA": stats['female_nda'], "NEUTRAL": stats['female_neu']}
        },
        "age_split": {
            "18-25": {"UDF": stats['age_18_25_udf'], "LDF": stats['age_18_25_ldf'], "NDA": stats['age_18_25_nda'], "NEUTRAL": stats['age_18_25_neu']},
            "26-40": {"UDF": stats['age_26_40_udf'], "LDF": stats['age_26_40_ldf'], "NDA": stats['age_26_40_nda'], "NEUTRAL": stats['age_26_40_neu']},
            "41-60": {"UDF": stats['age_41_60_udf'], "LDF": stats['age_41_60_ldf'], "NDA": stats['age_41_60_nda'], "NEUTRAL": stats['age_41_60_neu']},
            "60+": {"UDF": stats['age_60_plus_udf'], "LDF": stats['age_60_plus_ldf'], "NDA": stats['age_60_plus_nda'], "NEUTRAL": stats['age_60_plus_neu']}
        },
        "missing_votes": {
            "Likely": {"UDF": stats['mv_likely_udf'], "LDF": stats['mv_likely_ldf'], "NDA": stats['mv_likely_nda'], "NEUTRAL": stats['mv_likely_neu']},
            "Unlikely": {"UDF": stats['mv_unlikely_udf'], "LDF": stats['mv_unlikely_ldf'], "NDA": stats['mv_unlikely_nda'], "NEUTRAL": stats['mv_unlikely_neu']},
            "Out of Station": {"UDF": stats['mv_oos_udf'], "LDF": stats['mv_oos_ldf'], "NDA": stats['mv_oos_nda'], "NEUTRAL": stats['mv_oos_neu']},
            "Abroad": {"UDF": stats['mv_abroad_udf'], "LDF": stats['mv_abroad_ldf'], "NDA": stats['mv_abroad_nda'], "NEUTRAL": stats['mv_abroad_neu']},
            "Outside State": {"UDF": stats['mv_state_udf'], "LDF": stats['mv_state_ldf'], "NDA": stats['mv_state_nda'], "NEUTRAL": stats['mv_state_neu']},
            "Outside District": {"UDF": stats['mv_district_udf'], "LDF": stats['mv_district_ldf'], "NDA": stats['mv_district_nda'], "NEUTRAL": stats['mv_district_neu']},
        }
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
    
    # Handle pagination for UI or full export for download
    if page is not None and page_size is not None and page_size > 0:
        start = (page - 1) * page_size
        voters_slice = voters.select_related('booth', 'booth__local_body', 'booth__constituency')[start:start+page_size]
    else:
        # Full list for export
        voters_slice = voters.select_related('booth', 'booth__local_body', 'booth__constituency')

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
    if 'password' in data and data['password']:
        user.set_password(data['password'])
        user.save()
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

def change_user_password(username, old_password, new_password):
    from django.contrib.auth import authenticate
    user = authenticate(username=username, password=old_password)
    if not user:
        return False, "Incorrect current password"
    user.set_password(new_password)
    user.save()
    return True, "Password changed successfully"

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

def get_war_room_tactical_stats(user_profile, constituency_id=None, lb_id=None, booth_id=None, perspective='UDF'):
    perspective = str(perspective).strip().upper()
    """
    Tactical tracking for War Room. 
    Returns daily/weekly progress for the selected scope.
    """
    from django.db.models import Sum, Avg, F, Count, Case, When, IntegerField, Q
    from datetime import datetime, timedelta
    from core_db.models import DailyProgress, Voter
    
    # 1. Determine Scope
    if user_profile.role == 'SUPERUSER':
        base_booths = Booth.objects.all()
    else:
        voters_scope = user_profile.get_accessible_voters()
        accessible_booth_ids = list(voters_scope.values_list('booth_id', flat=True).distinct())
        
        if not accessible_booth_ids:
            # Fallback: check assigned booths/lbs if no voters digitized yet
            ids = list(user_profile.assigned_booths.values_list('id', flat=True))
            lb_ids = list(user_profile.assigned_local_bodies.values_list('id', flat=True))
            if lb_ids:
                ids += list(Booth.objects.filter(local_body_id__in=lb_ids).values_list('id', flat=True))
            accessible_booth_ids = list(set(ids))

        base_booths = Booth.objects.filter(id__in=accessible_booth_ids)
    
    # Apply Geography Filters
    if booth_id:
        base_booths = base_booths.filter(id=booth_id)
    elif lb_id:
        base_booths = base_booths.filter(local_body_id=lb_id)
    elif constituency_id:
        base_booths = base_booths.filter(constituency_id=constituency_id)
        
    booth_ids = list(base_booths.values_list('id', flat=True))
    print(f"DEBUG: War Room Stats for Const ID: {constituency_id}, Booths found: {len(booth_ids)}")
    performance = {"top_win": [], "bottom_win": [], "top_neutrals": [], "bottom_neutrals": []}

    if not booth_ids:
        return {"summary": {}, "history": [], "breakdown": [], "daily_change": {"digitized": 0, "udf": 0}, "weekly_change": {"digitized": 0, "udf": 0}, "performance": performance}

    # 2. Get Dates (Robust: find latest available data date)
    latest_rec = DailyProgress.objects.filter(booth_id__in=booth_ids).order_by('-date').first()
    
    if latest_rec:
        today = latest_rec.date
    else:
        from datetime import date
        today = date.today()

    yesterday = today - timedelta(days=1)
    last_week = today - timedelta(days=7)
    
    def get_agg(date_val, live=False):
        p_lower = perspective.lower()
        if live:
            # Match ALL voters in the accessible booths
            voters = Voter.objects.filter(booth_id__in=booth_ids)
            stats = voters.aggregate(
                digitized=Count('id', filter=Q(voter_leaning__isnull=False)),
                supporters=Count('id', filter=Q(voter_leaning=perspective.upper())),
                UDF=Count('id', filter=Q(voter_leaning='UDF')),
                LDF=Count('id', filter=Q(voter_leaning='LDF')),
                NDA=Count('id', filter=Q(voter_leaning='NDA')),
                NEUTRAL=Count('id', filter=Q(voter_leaning='NEUTRAL')),
            )
            # Re-map lowercase for internal compatibility
            stats['udf'] = stats['UDF']
            stats['ldf'] = stats['LDF']
            stats['nda'] = stats['NDA']
            stats['neutral'] = stats['NEUTRAL']
            
            # Still get deltas from snapshots
            snaps = DailyProgress.objects.filter(booth_id__in=booth_ids, date=date_val).aggregate(
                new_dig=Sum('new_digitized'),
                new_supporters=Sum(f'new_{p_lower}'),
                new_udf=Sum('new_udf'),
                new_ldf=Sum('new_ldf'),
                new_nda=Sum('new_nda')
            )
            
            # Dynamic Win Prob calculation: Supporters / Digitized * 100
            # We use a slight multiplier to represent 'likely' votes for a more dynamic feel
            raw_prob = (stats['supporters'] / max(1, stats['digitized'])) * 100
            stats['win_prob'] = min(99, round(raw_prob * 1.05, 1))
            
            res = {**stats, **snaps}
        else:
            res = DailyProgress.objects.filter(booth_id__in=booth_ids, date=date_val).aggregate(
                digitized=Sum('digitized_total'),
                supporters=Sum(f'{p_lower}_total'),
                udf=Sum('udf_total'),
                ldf=Sum('ldf_total'),
                nda=Sum('nda_total'),
                neutral=Sum('neutral_total'),
                new_dig=Sum('new_digitized'),
                new_supporters=Sum(f'new_{p_lower}'),
                new_udf=Sum('new_udf'),
                new_ldf=Sum('new_ldf'),
                new_nda=Sum('new_nda')
            )
            # Dynamic Win Prob for non-live snapshots too
            raw_prob = (res['supporters'] / max(1, res['digitized'] or 0)) * 100
            res['win_prob'] = min(99, round(raw_prob * 1.05, 1))

        for k in res: 
            if res[k] is None: res[k] = 0
        
        return res

    current = get_agg(today, live=True)
    prev_day = get_agg(yesterday)
    prev_week = get_agg(last_week)
    
    # 3. History Timeline (Last 14 days)
    history_raw = DailyProgress.objects.filter(
        booth_id__in=booth_ids, 
        date__gte=today - timedelta(days=14),
        date__lte=today
    ).values('date').annotate(
        digitized=Sum('digitized_total'),
        supporters=Sum(f'{perspective.lower()}_total'),
        new_dig=Sum('new_digitized'),
        new_supporters=Sum(f'new_{perspective.lower()}'),
        win_prob=Avg('winning_chance')
    ).order_by('date')
    
    history = []
    for h in history_raw:
        # If the date is 'today', use the 'current' live aggregate for better precision
        if h['date'] == today:
            d_val = current['digitized']
            s_val = current['supporters']
        else:
            d_val = h['digitized'] or 0
            s_val = h['supporters'] or 0

        history.append({
            "date": h['date'].isoformat(),
            "digitized": d_val,
            "supporters": s_val,
            "new_dig": h['new_dig'] or 0,
            "new_supporters": h['new_supporters'] or 0,
            "win_prob": round(h['win_prob'] or 0, 1)
        })

    # 4. Breakdown Grid (Live Data Aggregation)
    breakdown = []
    voters_base = user_profile.get_accessible_voters()
    
    if booth_id or lb_id:
        # Show Booth breakdown
        booths_in_scope = base_booths.order_by('number')
        for b in booths_in_scope:
            b_voters = voters_base.filter(booth=b)
            stats = b_voters.aggregate(
                total=Count('id'),
                udf=Count(Case(When(voter_leaning='UDF', then=1), output_field=IntegerField())),
                ldf=Count(Case(When(voter_leaning='LDF', then=1), output_field=IntegerField())),
                nda=Count(Case(When(voter_leaning='NDA', then=1), output_field=IntegerField())),
                tagged=Count(Case(When(voter_leaning__isnull=False, then=1), output_field=IntegerField()))
            )
            
            # Get daily deltas from snapshots
            stats_rec = DailyProgress.objects.filter(booth=b, date=today).first()
            
            if stats['total'] > 0:
                breakdown.append({
                    "id": b.id,
                    "name": f"Booth {b.number}",
                    "sub": b.polling_station_name or b.name or "",
                    "total_voters": stats['total'],
                    "digitized": stats['tagged'],
                    "udf": stats['udf'],
                    "ldf": stats['ldf'],
                    "nda": stats['nda'],
                    "perspective_total": stats.get(perspective.lower(), 0),
                    "daily_dig": stats_rec.new_digitized if stats_rec else 0,
                    "daily_perspective": getattr(stats_rec, f'new_{perspective.lower()}') if stats_rec else 0,
                    "win_prob": stats_rec.winning_chance if stats_rec else 0,
                    "coverage": round((stats['tagged'] / stats['total']) * 100, 1) if stats['total'] > 0 else 0
                })
    else:
        # Show Local Body breakdown
        lbs_in_scope = LocalBody.objects.filter(booths__in=base_booths).distinct()
        for lb in lbs_in_scope:
            lb_booths = base_booths.filter(local_body=lb)
            lb_voters = voters_base.filter(booth__in=lb_booths)
            
            stats = lb_voters.aggregate(
                total=Count('id'),
                udf=Count(Case(When(voter_leaning='UDF', then=1), output_field=IntegerField())),
                ldf=Count(Case(When(voter_leaning='LDF', then=1), output_field=IntegerField())),
                nda=Count(Case(When(voter_leaning='NDA', then=1), output_field=IntegerField())),
                tagged=Count(Case(When(voter_leaning__isnull=False, then=1), output_field=IntegerField()))
            )
            
            # Snapshots for daily progress
            snapshot = DailyProgress.objects.filter(booth_id__in=lb_booths, date=today).aggregate(
                new_dig=Sum('new_digitized'),
                new_perspective=Sum(f'new_{perspective.lower()}'),
                win_prob=Avg('winning_chance')
            )
            
            if stats['total'] > 0:
                breakdown.append({
                    "id": lb.id,
                    "name": lb.name,
                    "sub": lb.get_body_type_display(),
                    "total_voters": stats['total'],
                    "digitized": stats['tagged'],
                    "udf": stats['udf'],
                    "ldf": stats['ldf'],
                    "nda": stats['nda'],
                    "perspective_total": stats.get(perspective.lower(), 0),
                    "daily_dig": snapshot['new_dig'] or 0,
                    "daily_perspective": snapshot['new_perspective'] or 0,
                    "win_prob": round(snapshot['win_prob'] or 0, 1),
                    "coverage": round((stats['tagged'] / stats['total']) * 100, 1) if stats['total'] > 0 else 0
                })

    # 5. Tactical Performance Insights (Top/Bottom 5 Booths)
    performance = {
        "top_win": [],
        "bottom_win": [],
        "top_neutrals": [],
        "bottom_neutrals": []
    }
    
    # Fetch all booth stats in scope using a single high-efficiency aggregation
    booth_performance_raw = Booth.objects.filter(id__in=booth_ids).annotate(
        h_name=F('head_name'),
        h_phone=F('head_phone'),
        total=Count('voters'),
        tagged=Count('voters', filter=Q(voters__voter_leaning__isnull=False)),
        persp=Count('voters', filter=Q(voters__voter_leaning=perspective)),
        v_udf=Count('voters', filter=Q(voters__voter_leaning='UDF')),
        v_ldf=Count('voters', filter=Q(voters__voter_leaning='LDF')),
        v_nda=Count('voters', filter=Q(voters__voter_leaning='NDA')),
        v_neu=Count('voters', filter=Q(voters__voter_leaning='NEUTRAL'))
    ).values('id', 'number', 'polling_station_name', 'h_name', 'h_phone', 'total', 'tagged', 'persp', 'v_udf', 'v_ldf', 'v_nda', 'v_neu')
    
    perf_list = []
    for b in booth_performance_raw:
        total = b['total']
        tagged = b['tagged']
        coverage = (tagged / total * 100) if total > 0 else 0
        win_prob = (b['persp'] / tagged * 100) if tagged > 0 else 0
        
        perf_list.append({
            "id": b['id'],
            "number": b['number'],
            "ps_name": b['polling_station_name'] or f"Booth {b['number']}",
            "head_name": b['h_name'],
            "head_phone": b['h_phone'],
            "win_prob": round(win_prob, 1),
            "neutrals": b['v_neu'],
            "udf": b['v_udf'],
            "ldf": b['v_ldf'],
            "nda": b['v_nda'],
            "neutral": b['v_neu'],
            "total": total,
            "coverage": round(coverage, 1)
        })

    if perf_list:
        performance["top_win"] = sorted(perf_list, key=lambda x: x['win_prob'], reverse=True)[:5]
        performance["bottom_win"] = sorted(perf_list, key=lambda x: x['win_prob'])[:5]
        performance["top_neutrals"] = sorted(perf_list, key=lambda x: x['neutrals'], reverse=True)[:5]
        performance["bottom_neutrals"] = sorted(perf_list, key=lambda x: x['neutrals'])[:5]

    # 4b. Periodic Growth (Sum of deltas for the window)
    # This is more accurate for "ADDED" metrics than comparing totals (which can drop during data cleanup)
    week_start = today - timedelta(days=6)
    periodic_growth = DailyProgress.objects.filter(
        booth_id__in=booth_ids,
        date__gte=week_start,
        date__lte=today
    ).aggregate(
        dig=Sum('new_digitized'),
        supp=Sum(f'new_{perspective.lower()}'),
        udf=Sum('new_udf')
    )
    for k in periodic_growth:
        if periodic_growth[k] is None: periodic_growth[k] = 0

    return {
        "summary": current,
        "daily_change": {
            "digitized": current['new_dig'],
            "supporters": current['new_supporters'],
            "udf": current.get('new_udf', 0), # Fallback if specific UDF field missing in some snap versions
        },
        "weekly_change": {
            "digitized": periodic_growth['dig'],
            "supporters": periodic_growth['supp'],
            "udf": periodic_growth['udf'],
        },
        "history": history,
        "breakdown": breakdown,
        "performance": performance
    }
