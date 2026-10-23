from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...models.models import User, UserProfile
from ...schemas import schemas
from ...core import security
from ..deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, session: Session = Depends(get_db)):
    db_user = session.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pass = security.get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_pass, full_name=user.full_name)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    profile = UserProfile(user_id=new_user.id, proficiency_level="Beginner")
    session.add(profile)
    session.commit()
    return new_user

@router.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_db)):
    user = session.query(User).filter(User.email == form_data.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = security.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
