from pydantic import BaseModel
from typing import Optional

class TutorAskRequest(BaseModel):
    query: str
    context: Optional[str] = ""
