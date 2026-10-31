from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List
import fitz
from ...db.session import get_db
from ...models.models import User, QuizAttempt, UserProfile, QuestionAttempt
from ...schemas import schemas
from ...services import ai_service, analysis_engine
from ...api.deps import get_current_user

router = APIRouter()

@router.post("/generate", response_model=List[schemas.Question])
async def create_quiz(request: schemas.QuizStartRequest, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    if not 1 <= request.num_questions <= 30:
        raise HTTPException(status_code=422, detail="Choose between 1 and 30 questions.")
    if not request.topic or not request.topic.strip():
        raise HTTPException(status_code=422, detail="Enter a topic or upload a readable PDF.")
    profile = session.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    try:
        return await ai_service.generate_quiz(request.topic, request.proficiency, request.num_questions,
                                              (profile.weaknesses or []) if profile else [])
    except ai_service.AIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

@router.post("/submit", response_model=schemas.QuizResult)
async def submit_quiz(result: schemas.QuizResult, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    if not result.questions or len(result.questions) != len(result.answers) or len(result.questions) != result.total_questions:
        raise HTTPException(status_code=422, detail="Quiz questions and answers must have matching lengths.")
    # Recalculate on the server; do not trust the frontend's score or concept calculations.
    correct_count = 0
    concepts = defaultdict(lambda: [0, 0])
    for question, answer in zip(result.questions, result.answers):
        if question.correct_answer not in question.options:
            raise HTTPException(status_code=422, detail="Question answer is not among the available options.")
        correct = answer is not None and answer == question.correct_answer
        correct_count += int(correct)
        concepts[question.concept_tag][0] += int(correct)
        concepts[question.concept_tag][1] += 1
    concept_performance = {tag: round(c / n, 4) for tag, (c, n) in concepts.items()}
    score = round(100 * correct_count / len(result.questions), 2)
    attempt = QuizAttempt(
        user_id=current_user.id, topic=result.topic, score=score,
        total_questions=len(result.questions), time_taken=max(0, result.time_taken),
        concept_performance=concept_performance, behavioral_insights=result.behavioral_insights,
    )
    try:
        session.add(attempt)
        session.flush()
        for q, answer in zip(result.questions, result.answers):
            session.add(QuestionAttempt(
                quiz_attempt_id=attempt.id, question_text=q.question_text,
                correct_answer=q.correct_answer, user_answer=answer,
                is_correct=(answer is not None and answer == q.correct_answer),
                concept_tag=q.concept_tag, options=q.options,
            ))
        # Flush so the attempt is included in the aggregate profile update.
        session.flush()
        profile_data = await analysis_engine.generate_attempt_profile(attempt.id, session)
        attempt.attempt_summary = profile_data["summary"]
        attempt.attempt_strengths = profile_data["strengths"]
        attempt.attempt_weaknesses = profile_data["weaknesses"]
        analysis_engine.update_user_profile(current_user.id, session)
        session.commit()
        return {**result.model_dump(), "score": score, "concept_performance": concept_performance,
                "id": attempt.id, "attempt_summary": attempt.attempt_summary,
                "attempt_strengths": attempt.attempt_strengths, "attempt_weaknesses": attempt.attempt_weaknesses}
    except Exception:
        session.rollback()
        raise

@router.get("/explanation")
async def get_quiz_explanation(question: str, user_answer: str, correct_answer: str,
                               proficiency: str = "Beginner", current_user: User = Depends(get_current_user)):
    try:
        explanation = await ai_service.get_explanation(question, user_answer, correct_answer, proficiency)
        return {"explanation": explanation}
    except ai_service.AIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

@router.get("/history")
def get_quiz_history(current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    return session.query(QuizAttempt).options(joinedload(QuizAttempt.questions)).filter(
        QuizAttempt.user_id == current_user.id).order_by(QuizAttempt.created_at.desc()).all()

@router.get("/attempt/{attempt_id}")
def get_quiz_attempt(attempt_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    attempt = session.query(QuizAttempt).options(joinedload(QuizAttempt.questions)).filter(
        QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
    return attempt

@router.get("/summary/{attempt_id}")
async def get_quiz_summary(attempt_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_db)):
    attempt = session.query(QuizAttempt).filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
    return {"summary": await analysis_engine.generate_performance_summary(attempt.id, session)}

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    content = await file.read(10_000_001)
    if len(content) > 10_000_000:
        raise HTTPException(status_code=413, detail="PDF must be 10MB or smaller")
    try:
        with fitz.open(stream=content, filetype="pdf") as doc:
            text = "\n".join(page.get_text() for page in doc).strip()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not read the PDF") from exc
    if not text:
        raise HTTPException(status_code=422, detail="PDF contains no extractable text (scanned PDF requires OCR)")
    return {"filename": file.filename, "text": text[:10000]}
