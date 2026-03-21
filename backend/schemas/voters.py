from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class VoterEdit(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    house_name: Optional[str] = None
    house_no: Optional[str] = None
    relation_name: Optional[str] = None
    phone_no: Optional[str] = None
    voter_leaning: Optional[str] = None
    current_location: Optional[str] = None
    voting_probability: Optional[float] = None
    is_head_of_family: Optional[bool] = None

class SaveBatchRequest(BaseModel):
    batch_id: str
    constituency: str = ""
    lgb_type: str = ""
    lgb_name: str = ""
    booth: str = ""  # Legacy
    booth_id: str = "" # Explicit ID for existing booths
    booth_number: str = "" # Explicit Number for new booths
    ps_no: str = ""
    ps_name: str = ""
