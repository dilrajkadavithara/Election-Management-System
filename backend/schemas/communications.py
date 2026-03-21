from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class VoterFilters(BaseModel):
    constituency: Optional[int] = None
    lb: Optional[int] = None
    booth: Optional[int] = None
    gender: Optional[str] = None
    ageFrom: Optional[int] = None
    ageTo: Optional[int] = None
    leaning: Optional[str] = None
    serialFrom: Optional[int] = None
    serialTo: Optional[int] = None
    location: Optional[str] = None

class BroadcastRequest(BaseModel):
    heading: str
    message: str
    medium: str # SMS, WHATSAPP, etc.
    filters: VoterFilters
    image_path: Optional[str] = None

class TemplateOp(BaseModel):
    name: str
    content: str
    is_active: Optional[bool] = True
