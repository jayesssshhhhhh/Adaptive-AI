from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ...db.session import get_db
from ...models.models import User, UserProfile
from ...schemas import schemas
from ...services import ai_service, analysis_engine
from ...api.deps import get_current_user

router = APIRouter()

@router.post("/chat")
async def chat(request: schemas.ChatRequest, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    profile = session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    # Get user context
    knowledge_map = analysis_engine.get_knowledge_map(current_user.id, session)
    user_context = {
        "proficiency": profile.proficiency_level if profile else "Beginner",
        "strengths": knowledge_map.get("strengths", []),
        "weaknesses": knowledge_map.get("weaknesses", []),
    }
    
    try:
        response = await ai_service.chat_with_tutor(request.message, request.history, user_context, request.file_context)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
