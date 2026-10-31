"""Recalculate learner profile fields from quiz attempts already in PostgreSQL.
Run from backend/: python backfill_profiles.py
"""
from app.db.session import SessionLocal
from app.models.models import User
from app.services.analysis_engine import update_user_profile

def main():
    db = SessionLocal()
    try:
        user_ids = [uid for (uid,) in db.query(User.id).all()]
        for uid in user_ids:
            update_user_profile(uid, db)
        db.commit()
        print(f"Updated {len(user_ids)} learner profile(s) from saved quiz attempts.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
