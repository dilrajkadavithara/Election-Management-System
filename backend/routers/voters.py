import csv, io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from backend.dependencies import get_current_user
from backend.django_bridge import (
    get_voters_async, edit_voter_async, toggle_attendance_async, get_voting_stats_async
)
from backend.schemas.voters import VoterEdit

router = APIRouter(prefix="/api/voters", tags=["Voter Records"])

@router.get("")
async def get_voters_api(
    search: str = None, page: int = 1, page_size: int = 50,  # max enforced below
    constituency: str = None, lb: str = None, booth: str = None,
    gender: str = None, age_from: str = None, age_to: str = None,
    leaning: str = None, serial_from: str = None, serial_to: str = None,
    location: str = None,
    is_head_of_family: bool = None,
    user_info=Depends(get_current_user)
):
    # Allow up to 2000 when a specific booth is selected (Election Day needs all voters)
    # Otherwise cap at 200 to prevent memory exhaustion on unfiltered queries
    max_size = 2000 if booth else 200
    page_size = min(page_size, max_size)
    c_id = int(constituency) if constituency and str(constituency).isdigit() else None
    l_id = int(lb) if lb and str(lb).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    return await get_voters_async(
        user_info['username'], search, page, page_size,
        constituency_id=c_id, lb_id=l_id, booth_id=b_id, gender=gender,
        age_from=age_from, age_to=age_to, leaning=leaning,
        serial_from=serial_from, serial_to=serial_to, location=location,
        is_head_of_family=is_head_of_family
    )

@router.get("/voting-stats")
async def get_voter_stats_api(constituency: str = None, lb: str = None, booth: str = None, user_info=Depends(get_current_user)):
    c_id = int(constituency) if constituency and str(constituency).isdigit() else None
    l_id = int(lb) if lb and str(lb).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    return await get_voting_stats_async(user_info['username'], c_id, l_id, b_id)

@router.post("/toggle-attendance")
async def toggle_attendance_api(voter_id: int, has_voted: bool, user_info=Depends(get_current_user)):
    if not user_info.get('can_edit_voters', False) and user_info.get('role') != 'BOOTH_AGENT':
         raise HTTPException(403, "You do not have permission to mark attendance")

    # RBAC scope check: booth agents can only toggle voters in their assigned booths
    if user_info.get('role') == 'BOOTH_AGENT':
        from backend.django_bridge import check_voter_scope_async
        in_scope = await check_voter_scope_async(voter_id, user_info['username'])
        if not in_scope:
            raise HTTPException(403, "This voter is not in your assigned booth")

    success, result = await toggle_attendance_async(voter_id, has_voted)
    if not success:
        raise HTTPException(400, result)
    return result

@router.post("/edit/{voter_id}")
async def edit_voter(voter_id: int, data: VoterEdit, user_info=Depends(get_current_user)):
    if user_info['role'] in ['CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD']:
        raise HTTPException(403, "Admins have read-only access to individual voter records")

    # RBAC scope check: booth agents can only edit voters in their assigned booths
    if user_info.get('role') == 'BOOTH_AGENT':
        from backend.django_bridge import check_voter_scope_async
        in_scope = await check_voter_scope_async(voter_id, user_info['username'])
        if not in_scope:
            raise HTTPException(403, "This voter is not in your assigned booth")

    success, msg = await edit_voter_async(voter_id, data.dict(exclude_unset=True))
    return {"success": success, "message": msg}

@router.get("/export")
async def export_voters(
    search: str = None, 
    constituency: str = None, lb: str = None, booth: str = None,
    gender: str = None, age_from: str = None, age_to: str = None,
    leaning: str = None, location: str = None,
    serial_from: str = None, serial_to: str = None,
    user_info=Depends(get_current_user)
):
    if not user_info.get('can_download', False):
        raise HTTPException(403, "You do not have permission to export data")
    
    c_id = int(constituency) if constituency and str(constituency).isdigit() else None
    l_id = int(lb) if lb and str(lb).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    
    data = await get_voters_async(user_info['username'], search, None, 0, c_id, l_id, b_id, gender, age_from, age_to, leaning, serial_from, serial_to, location)
    results = data['results']
    
    def generate():
        output = io.StringIO()
        if not results:
            yield "No records found"
            return

        fieldnames = [
            'constituency', 'local_body', 'booth_no', 'ps_name',
            'serial_no', 'full_name', 'epic_id', 'gender', 'age', 
            'relation_name', 'relation_type', 'house_name', 'house_no', 
            'phone_no', 'voter_leaning', 'current_location', 'voting_probability'
        ]
        display_headers = {f: f.replace('_', ' ').title() for f in fieldnames}
        # Special cases for display
        display_headers['lb_id'] = 'Local Body / Panchayat'
        display_headers['ps_name'] = 'Polling Station Name'
        
        yield '\ufeff' # BOM
        writer = csv.DictWriter(output, fieldnames=[display_headers.get(f, f) for f in fieldnames], extrasaction='ignore')
        writer.writeheader()
        yield output.getvalue()
        output.seek(0); output.truncate(0)

        for voter in results:
            row = {display_headers.get(f, f): voter.get(f, '') for f in fieldnames}
            writer.writerow(row)
            yield output.getvalue()
            output.seek(0); output.truncate(0)

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=voters_export.csv"}
    )
