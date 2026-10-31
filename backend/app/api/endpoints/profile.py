from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...models.models import User, UserProfile, StudyGuide
from ...schemas import schemas
from ...api.deps import get_current_user
from ...services import ai_service, analysis_engine
from typing import List

router = APIRouter()

@router.get("/", response_model=schemas.ProfileDetails)
def get_profile(current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    profile = session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Learning profile not found")
    return profile

@router.put("/", response_model=schemas.ProfileDetails)
def update_profile(request: schemas.ProfileUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    profile = session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id, proficiency_level="Beginner")
        session.add(profile)
    if request.proficiency_level is not None:
        profile.proficiency_level = request.proficiency_level
    if request.interests is not None:
        profile.interests = request.interests
    session.commit()
    session.refresh(profile)
    return profile

@router.get("/stats")
def get_stats(current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    return analysis_engine.get_user_stats(current_user.id, session)

@router.get("/knowledge-map")
def get_knowledge_map(current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    return analysis_engine.get_knowledge_map(current_user.id, session)

@router.get("/recommendations")
async def get_recommendations(current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    profile = session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    knowledge_map = analysis_engine.get_knowledge_map(current_user.id, session)
    weaknesses = list(dict.fromkeys(c for topic in knowledge_map.values() for c in topic.get("weaknesses", [])))
    if not weaknesses and profile:
        weaknesses = profile.weaknesses or []
    if not weaknesses:
        return {"suggested_topic": "General Fundamentals", "reason": "Complete a quiz to personalize your recommendations."}
    topic = weaknesses[0]
    try:
        suggestion = await ai_service._generate(f"Suggest ONE focused subtopic for a student struggling with '{topic}'. Return only the subtopic name.")
        return {"suggested_topic": suggestion, "reason": f"Strengthening {topic} will improve your foundation."}
    except ai_service.AIServiceError:
        return {"suggested_topic": topic, "reason": "Based on your latest quiz mistakes."}

@router.post("/study-material")
async def generate_study_material_endpoint(request: schemas.StudyMaterialRequest, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    if not request.topic.strip() or not (1 <= request.duration <= 120) or request.mode not in ("adaptive", "explore"):
        raise HTTPException(status_code=422, detail="Enter a topic, choose a 1–120 minute duration, and a valid mode.")
    profile = session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    proficiency = profile.proficiency_level if profile and profile.proficiency_level else "Beginner"
    try:
        if request.mode == "explore":
            content = await ai_service.generate_explore_material(request.topic, request.duration, proficiency)
        else:
            content = await ai_service.generate_study_material(request.topic, request.subtopic or "Fundamentals", request.duration, proficiency)
    except ai_service.AIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    guide = StudyGuide(user_id=current_user.id, topic=request.topic, subtopic=request.subtopic or None,
                       duration=request.duration, content=content, mode=request.mode)
    session.add(guide)
    session.commit()
    return {"content": content}

@router.get("/study-history", response_model=List[schemas.StudyGuideOut])
def get_study_history(limit: int = Query(3, ge=1, le=50), offset: int = Query(0, ge=0),
                      current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    return (session.query(StudyGuide).filter(StudyGuide.user_id == current_user.id)
            .order_by(StudyGuide.created_at.desc()).offset(offset).limit(limit).all())
