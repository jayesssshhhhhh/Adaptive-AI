from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ProfileUpdate(BaseModel):
    proficiency_level: Optional[str] = None
    interests: Optional[List[str]] = None

class ProfileDetails(ProfileUpdate):
    model_config = {"from_attributes": True}
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    learning_speed: Optional[float] = None  # seconds per question
    accuracy_trend: Optional[List[dict]] = None

class QuizStartRequest(BaseModel):
    topic: Optional[str] = None
    file_id: Optional[str] = None
    proficiency: str
    num_questions: int

class Question(BaseModel):
    question_text: str
    options: List[str]
    correct_answer: str
    concept_tag: str

class QuizResult(BaseModel):
    id: Optional[int] = None
    score: float
    total_questions: int
    time_taken: int
    concept_performance: Any
    behavioral_insights: Any
    questions: List[Question]
    answers: List[Optional[str]]
    topic: Optional[str] = None
    attempt_summary: Optional[str] = None
    attempt_strengths: Optional[List[str]] = None
    attempt_weaknesses: Optional[List[str]] = None

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    file_context: Optional[str] = None

class StudyMaterialRequest(BaseModel):
    topic: str
    subtopic: Optional[str] = ""
    duration: int
    mode: Optional[str] = "adaptive"  # "adaptive" or "explore"

class StudyGuideOut(BaseModel):
    id: int
    topic: str
    subtopic: Optional[str] = None
    duration: int
    content: str
    mode: str
    created_at: datetime
    class Config:
        from_attributes = True
