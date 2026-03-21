from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    assignments: Dict[str, List[int]]
    can_download: bool
    can_upload: bool
    can_verify: bool
    can_edit_voters: bool
    can_send_broadcasts: bool
    can_manage_system: bool
