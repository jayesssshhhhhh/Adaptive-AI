"""Consistent quiz analytics and learner-profile tracking."""
from collections import defaultdict
from sqlalchemy.orm import Session
from ..models.models import QuizAttempt, UserProfile
from .ai_service import _generate, AIServiceError


def _safe_concepts(raw):
    if not isinstance(raw, dict):
        return {}
    result = {}
    for name, value in raw.items():
        try:
            score = float(value)
        except (ValueError, TypeError):
            continue
        if 0 <= score <= 1:
            result[str(name)] = score
    return result


def _attempts(user_id: int, db: Session):
    return (db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id)
            .order_by(QuizAttempt.created_at.asc(), QuizAttempt.id.asc()).all())


def get_user_stats(user_id: int, db: Session):
    attempts = _attempts(user_id, db)
    if not attempts:
        return {"topics_mastered": 0, "total_time": 0, "avg_score": 0}
    valid = [a for a in attempts if a.score is not None]
    # Weight quizzes by number of questions, instead of averaging a 2-Q quiz and a 20-Q quiz equally.
    count = sum((a.total_questions or 0) for a in valid)
    avg_score = (sum(float(a.score) * (a.total_questions or 0) for a in valid) / count) if count else (sum(float(a.score) for a in valid) / len(valid) if valid else 0)
    concepts = defaultdict(list)
    for a in attempts:
        for name, score in _safe_concepts(a.concept_performance).items():
            concepts[name].append(score)
    mastered = sum(1 for scores in concepts.values() if sum(scores) / len(scores) >= .8)
    return {"topics_mastered": mastered, "total_time": round(sum(max(0, a.time_taken or 0) for a in attempts) / 60), "avg_score": round(avg_score)}


def get_knowledge_map(user_id: int, db: Session):
    grouped = defaultdict(lambda: defaultdict(list))
    for a in _attempts(user_id, db):
        topic = a.topic or "General Fundamentals"
        if len(topic) > 120:
            topic = "PDF learning material"
        for concept, score in _safe_concepts(a.concept_performance).items():
            grouped[topic][concept].append(score)
    result = {}
    for topic, concepts in grouped.items():
        averages = {c: sum(v) / len(v) for c, v in concepts.items()}
        result[topic] = {
            "strengths": [k for k, s in sorted(averages.items(), key=lambda kv: -kv[1]) if s >= 0.7][:3],
            "weaknesses": [k for k, s in sorted(averages.items(), key=lambda kv: kv[1]) if s < 0.7][:3],
        }
    return result


def update_user_profile(user_id: int, db: Session):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile is None:
        profile = UserProfile(user_id=user_id, proficiency_level="Beginner")
        db.add(profile)
    knowledge_map = get_knowledge_map(user_id, db)
    profile.strengths = list(dict.fromkeys(c for data in knowledge_map.values() for c in data["strengths"]))[:10]
    profile.weaknesses = list(dict.fromkeys(c for data in knowledge_map.values() for c in data["weaknesses"]))[:10]
    attempts = _attempts(user_id, db)
    profile.accuracy_trend = [{"quiz_id": a.id, "score": round(a.score, 1)} for a in attempts if a.score is not None][-10:]
    total_questions = sum(max(0, a.total_questions or 0) for a in attempts)
    total_seconds = sum(max(0, a.time_taken or 0) for a in attempts)
    profile.learning_speed = round(total_seconds / total_questions, 1) if total_questions else None  # sec/question
    db.flush()
    return profile


async def generate_attempt_profile(attempt_id: int, db: Session):
    """Compute consistent per-attempt summaries without requiring Gemini during save."""
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if attempt is None:
        return {"summary": "No quiz data found.", "strengths": [], "weaknesses": []}
    concepts = _safe_concepts(attempt.concept_performance)
    strengths = [c for c, s in sorted(concepts.items(), key=lambda kv: -kv[1]) if s >= .7][:3]
    weaknesses = [c for c, s in sorted(concepts.items(), key=lambda kv: kv[1]) if s < .7][:3]
    summary = f"You scored {round(attempt.score or 0)}% in {('PDF quiz' if len(attempt.topic or '') > 120 else (attempt.topic or 'your quiz'))}."
    if weaknesses:
        summary += f" Practice {weaknesses[0]} next to improve."
    elif strengths:
        summary += f" Well done on {strengths[0]}!"
    return {"summary": summary, "strengths": strengths, "weaknesses": weaknesses}


async def generate_performance_summary(attempt_id: int, db: Session):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if attempt is None:
        return "No quiz attempt found."
    if attempt.attempt_summary:
        return attempt.attempt_summary
    details = await generate_attempt_profile(attempt_id, db)
    return details["summary"]
