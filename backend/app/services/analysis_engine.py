from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.models import QuizAttempt, UserProfile
from .ai_service import client, MODEL_NAME, FALLBACK_MODEL
import json

async def generate_performance_summary(attempt_id: int, db: Session):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt: return "No data available."

    prompt = f"""
    Analyze this quiz attempt for a student:
    Score: {attempt.score}%
    Accuracy: {attempt.score}%
    Time Taken: {attempt.created_at} (Duration: {attempt.time_taken} seconds)
    Concept Performance: {json.dumps(attempt.concept_performance)}
    
    Provide a professional, motivating 3-sentence performance summary. 
    Focus on:
    1. Overall success or effort.
    2. Specific behavioral insight (e.g., "fast but accurate" or "struggled with [concept]").
    3. One actionable piece of advice for the next study session.
    
    Keep it strictly 2-3 sentences.
    """
    
    try:
        response = await client.aio.models.generate_content(model=MODEL_NAME, contents=prompt)
        return response.text.strip()
    except:
        return "You completed the quiz! Focus on reviewing your mistakes to strengthen your foundation."

def get_user_stats(user_id: int, db: Session):
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).all()
    if not attempts:
        return {"topics_mastered": 0, "total_time": 0, "avg_score": 0}

    total_time = sum(a.time_taken for a in attempts)
    avg_score = sum(a.score for a in attempts) / len(attempts)
    
    # Topics mastered (score > 80%)
    concepts = {}
    for a in attempts:
        for concept, score in a.concept_performance.items():
            if concept not in concepts: concepts[concept] = []
            concepts[concept].append(score)
            
    mastered = 0
    for concept, scores in concepts.items():
        if (sum(scores) / len(scores)) > 0.8:
            mastered += 1
            
    return {
        "topics_mastered": mastered,
        "total_time": round(total_time / 60), # in minutes
        "avg_score": round(avg_score)
    }

def get_knowledge_map(user_id: int, db: Session):
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).all()
    if not attempts: return {}

    topic_data = {}
    for a in attempts:
        topic = a.topic or "Miscellaneous"
        if topic not in topic_data:
            topic_data[topic] = {"concepts": {}}
        
        if a.concept_performance:
            for concept, score in a.concept_performance.items():
                if concept not in topic_data[topic]["concepts"]:
                    topic_data[topic]["concepts"][concept] = []
                topic_data[topic]["concepts"][concept].append(score)
            
    result = {}
    for topic, data in topic_data.items():
        averages = []
        for concept, scores in data["concepts"].items():
            averages.append({"name": concept, "score": sum(scores) / len(scores)})
        
        if not averages:
            continue
            
        sorted_avg = sorted(averages, key=lambda x: x["score"], reverse=True)
        result[topic] = {
            "strengths": [x["name"] for x in sorted_avg[:3] if x["score"] >= 0.7],
            "weaknesses": [x["name"] for x in reversed(sorted_avg) if x["score"] < 0.7][:3]
        }
    
    return result

async def generate_attempt_profile(attempt_id: int, db: Session):
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id).first()
    if not attempt: return {"summary": "Completed", "strengths": [], "weaknesses": []}

    prompt = f"""
    Analyze this SPECIFIC quiz attempt:
    Topic: {attempt.topic}
    Score: {attempt.score}%
    Concept Performance: {json.dumps(attempt.concept_performance)}
    
    Task:
    1. A short, professional 2-sentence summary of the session.
    2. A list of 1-3 specific concepts they mastered in THIS session.
    3. A list of 1-3 specific concepts they struggled with in THIS session.
    
    Return ONLY a JSON object with this structure:
    {{
       "summary": "...",
       "strengths": ["...", "..."],
       "weaknesses": ["...", "..."]
    }}
    """
    
    try:
        response = await client.aio.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        return data
    except Exception as e:
        print(f"ANALYSIS ERROR: {e}")
        # Fallback based on performance data
        strengths = [k for k, v in attempt.concept_performance.items() if v >= 0.8]
        weaknesses = [k for k, v in attempt.concept_performance.items() if v < 0.6]
        return {
            "summary": f"Your performance in {attempt.topic} shows promising growth. Great focus!",
            "strengths": strengths[:2],
            "weaknesses": weaknesses[:2]
        }
