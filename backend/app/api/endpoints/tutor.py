from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...models.models import User, UserProfile
from ...schemas import schemas
from ...services import ai_service, analysis_engine
from ...api.deps import get_current_user

router = APIRouter()

@router.post("/chat")
async def chat(request: schemas.ChatRequest, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    if not request.message.strip():
        raise HTTPException(status_code=422, detail="Chat message cannot be empty")
    profile = session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    knowledge_map = analysis_engine.get_knowledge_map(current_user.id, session)
    # Knowledge-map is keyed by *topic*, not a flat dict of strengths/weaknesses.
    strengths = list(dict.fromkeys(c for data in knowledge_map.values() for c in data.get("strengths", [])))
    weaknesses = list(dict.fromkeys(c for data in knowledge_map.values() for c in data.get("weaknesses", [])))
    user_context = {
        "proficiency": profile.proficiency_level if profile and profile.proficiency_level else "Beginner",
        "strengths": strengths or ((profile.strengths or []) if profile else []),
        "weaknesses": weaknesses or ((profile.weaknesses or []) if profile else []),
    }
    try:
        response = await ai_service.chat_with_tutor(request.message, request.history, user_context, request.file_context)
        return {"response": response}
    except ai_service.AIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
