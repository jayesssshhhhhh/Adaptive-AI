from fastapi import APIRouter
from .endpoints import auth, quiz, profile, tutor

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["quiz"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(tutor.router, prefix="/tutor", tags=["tutor"])
