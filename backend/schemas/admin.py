from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ConstituencyCreate(BaseModel):
    name: str

class ConstituencyUpdate(BaseModel):
    name: str = Field(..., description="Unique name of the constituency")
    code: Optional[str] = None

class LocalBodyCreate(BaseModel):
    const_id: int
    name: str
    type: str

class LocalBodyUpdate(BaseModel):
    name: str
    type: Optional[str] = None
    head_name: Optional[str] = None
    head_phone: Optional[str] = None

class BoothCreate(BaseModel):
    const_id: int
    lb_id: int
    number: str
    ps_name: Optional[str] = ""
    ps_no: Optional[str] = ""

class BoothUpdate(BaseModel):
    number: Optional[str] = None
    ps_name: Optional[str] = None
    ps_no: Optional[str] = None
    head_name: Optional[str] = None
    head_phone: Optional[str] = None

class AssignmentsPayload(BaseModel):
    constituencies: Optional[List[int]] = []
    local_bodies: Optional[List[int]] = []
    booths: Optional[List[int]] = []

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    # Accept both flat and nested assignment formats
    assigned_constituencies: Optional[List[int]] = []
    assigned_local_bodies: Optional[List[int]] = []
    assigned_booths: Optional[List[int]] = []
    assignments: Optional[AssignmentsPayload] = None
    can_upload: Optional[bool] = False
    can_download: Optional[bool] = False
    can_verify: Optional[bool] = False
    can_edit_voters: Optional[bool] = False
    can_send_broadcasts: Optional[bool] = False
    can_manage_system: Optional[bool] = False

class UserUpdate(BaseModel):
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    password: Optional[str] = None
    # Accept both flat and nested assignment formats
    assigned_constituencies: Optional[List[int]] = None
    assigned_local_bodies: Optional[List[int]] = None
    assigned_booths: Optional[List[int]] = None
    assignments: Optional[AssignmentsPayload] = None
    can_upload: Optional[bool] = None
    can_download: Optional[bool] = None
    can_verify: Optional[bool] = None
    can_edit_voters: Optional[bool] = None
    can_send_broadcasts: Optional[bool] = None
    can_manage_system: Optional[bool] = None
