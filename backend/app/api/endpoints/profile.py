from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...models.models import User, UserProfile, StudyGuide
from ...schemas import schemas
from ...api.deps import get_current_user
from ...services import ai_service, analysis_engine
from typing import List

router = APIRouter()

@router.get("/", response_model=schemas.ProfileUpdate)
def get_profile(current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    return session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

@router.get("/stats")
def get_stats(current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    return analysis_engine.get_user_stats(current_user.id, session)

@router.get("/knowledge-map")
def get_knowledge_map(current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    return analysis_engine.get_knowledge_map(current_user.id, session)

@router.get("/recommendations")
async def get_recommendations(current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    profile = session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile or not profile.weaknesses:
        return {"suggested_topic": "General Fundamentals", "reason": "Fresh start!"}
    
    topic = profile.weaknesses[0]
    prompt = f"The user is weak in {topic}. Suggest a specific sub-topic or related concept they should study next to improve. Return ONLY the sub-topic name."
    response = await ai_service.client.aio.models.generate_content(model=ai_service.MODEL_NAME, contents=prompt)
    return {"suggested_topic": response.text.strip(), "reason": f"Focusing on {topic} will help balance your skills."}

@router.post("/study-material")
async def generate_study_material_endpoint(request: schemas.StudyMaterialRequest, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    profile = session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    proficiency = profile.proficiency_level if profile and profile.proficiency_level else "Intermediate"
    
    mode = request.mode or "adaptive"
    
    if mode == "explore":
        content = await ai_service.generate_explore_material(request.topic, request.duration, proficiency)
    else:
        content = await ai_service.generate_study_material(request.topic, request.subtopic, request.duration, proficiency)
    
    # Save to database
    guide = StudyGuide(
        user_id=current_user.id,
        topic=request.topic,
        subtopic=request.subtopic if request.subtopic else None,
        duration=request.duration,
        content=content,
        mode=mode
    )
    session.add(guide)
    session.commit()
    
    return {"content": content}

@router.get("/study-history", response_model=List[schemas.StudyGuideOut])
def get_study_history(
    limit: int = Query(3, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    guides = (
        session.query(StudyGuide)
        .filter(StudyGuide.user_id == current_user.id)
        .order_by(StudyGuide.created_at.desc())
        .offset(offset)
        .limit(limit + 1)  # Fetch one extra to know if there are more
        .all()
    )
    
    has_more = len(guides) > limit
    results = guides[:limit]
    
    # Return results with a custom header to indicate more availability
    return results
