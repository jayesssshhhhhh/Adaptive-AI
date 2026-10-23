from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    quiz_attempts = relationship("QuizAttempt", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    proficiency_level = Column(String)
    interests = Column(JSON)
    strengths = Column(JSON)
    weaknesses = Column(JSON)
    learning_speed = Column(Float)
    accuracy_trend = Column(JSON)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String)
    content_source = Column(String)
    difficulty = Column(String)
    score = Column(Float)
    total_questions = Column(Integer)
    time_taken = Column(Integer)
    behavioral_insights = Column(JSON)
    concept_performance = Column(JSON)
    attempt_summary = Column(String)
    attempt_strengths = Column(JSON)
    attempt_weaknesses = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="quiz_attempts")
    questions = relationship("QuestionAttempt", back_populates="quiz_attempt")

class QuestionAttempt(Base):
    __tablename__ = "question_attempts"
    id = Column(Integer, primary_key=True, index=True)
    quiz_attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"))
    question_text = Column(String)
    correct_answer = Column(String)
    user_answer = Column(String)
    is_correct = Column(Boolean)
    concept_tag = Column(String)
    options = Column(JSON)
    response_time = Column(Integer)
    answer_changes = Column(Integer, default=0)
    explanation = Column(String)

    quiz_attempt = relationship("QuizAttempt", back_populates="questions")

class StudyGuide(Base):
    __tablename__ = "study_guides"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String)
    subtopic = Column(String, nullable=True)
    duration = Column(Integer)
    content = Column(String)
    mode = Column(String, default="adaptive")  # "adaptive" or "explore"
    created_at = Column(DateTime, default=datetime.utcnow)
