from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import fitz # PyMuPDF
from ...db.session import get_db
from ...models.models import User, QuizAttempt, UserProfile, QuestionAttempt
from ...schemas import schemas
from ...services import ai_service
from ...api.deps import get_current_user

router = APIRouter()

@router.post("/generate", response_model=List[schemas.Question])
async def create_quiz(request: schemas.QuizStartRequest, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    profile = session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    weak_areas = profile.weaknesses if profile else []
    context = request.topic or "General topics"
    try:
        questions = await ai_service.generate_quiz(context, request.proficiency, request.num_questions, weak_areas)
        if not questions: 
            raise HTTPException(status_code=503, detail="The AI service is currently overwhelmed. Please try again in 30-60 seconds.")
        return questions
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit", response_model=schemas.QuizResult)
async def submit_quiz(result: schemas.QuizResult, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    attempt = QuizAttempt(
        user_id=current_user.id,
        topic=result.topic,
        score=result.score,
        total_questions=result.total_questions,
        time_taken=result.time_taken,
        concept_performance=result.concept_performance,
        behavioral_insights=result.behavioral_insights
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    
    # Save individual question results
    for i, q in enumerate(result.questions):
        q_attempt = QuestionAttempt(
            quiz_attempt_id=attempt.id,
            question_text=q.question_text,
            correct_answer=q.correct_answer,
            user_answer=result.answers[i] if i < len(result.answers) else None,
            is_correct=result.answers[i] == q.correct_answer if i < len(result.answers) else False,
            concept_tag=q.concept_tag,
            options=q.options
        )
        session.add(q_attempt)
    
    session.commit()
    
    # Generate and save per-quiz attempt profile
    profile_data = await analysis_engine.generate_attempt_profile(attempt.id, session)
    attempt.attempt_summary = profile_data.get("summary", "Lesson completed.")
    attempt.attempt_strengths = profile_data.get("strengths", [])
    attempt.attempt_weaknesses = profile_data.get("weaknesses", [])
    session.commit()
    
    return {**result.model_dump(), "id": attempt.id, **profile_data}

from ...services import ai_service, analysis_engine

# ... (rest of imports)

@router.get("/explanation")
async def get_quiz_explanation(question: str, user_answer: str, correct_answer: str, proficiency: str = "Beginner"):
    explanation = await ai_service.get_explanation(question, user_answer, correct_answer, proficiency)
    return {"explanation": explanation}

from sqlalchemy.orm import joinedload

@router.get("/history")
def get_quiz_history(current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    return session.query(QuizAttempt).options(joinedload(QuizAttempt.questions)).filter(QuizAttempt.user_id == current_user.id).order_by(QuizAttempt.created_at.desc()).all()

@router.get("/attempt/{attempt_id}")
def get_quiz_attempt(attempt_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    return session.query(QuizAttempt).options(joinedload(QuizAttempt.questions)).filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id).first()

@router.get("/summary/{attempt_id}")
async def get_quiz_summary(attempt_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    attempt = session.query(QuizAttempt).filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id).first()
    if not attempt: return {"summary": "Keep practicing to see insights!"}
    summary = await analysis_engine.generate_performance_summary(attempt.id, session)
    return {"summary": summary}

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.filename.endswith('.pdf'): raise HTTPException(status_code=400, detail="Only PDF supported")
    content = await file.read()
    doc = fitz.open(stream=content, filetype="pdf")
    text = "".join([page.get_text() for page in doc])
    return {"filename": file.filename, "text": text[:10000]}
