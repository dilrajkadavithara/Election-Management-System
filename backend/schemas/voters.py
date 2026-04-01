from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any

class VoterEdit(BaseModel):
    full_name: Optional[str] = None
    epic_id: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None

    @field_validator('age', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v
    house_name: Optional[str] = None
    house_no: Optional[str] = None
    relation_name: Optional[str] = None
    phone_no: Optional[str] = None
    voter_leaning: Optional[str] = None
    current_location: Optional[str] = None
    voting_probability: Optional[str] = None  # CharField choices: CONFIRMED, LIKELY, UNLIKELY, OUT_OF_STATION
    is_head_of_family: Optional[bool] = None
    family_number: Optional[str] = None

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
