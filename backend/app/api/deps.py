from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.models import User
from ..core import security

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_db)) -> User:
    payload = security.decode_access_token(token)
    if not payload: raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = session.query(User).filter(User.email == email).first()
    if not user: raise HTTPException(status_code=401, detail="User not found")
    return user
