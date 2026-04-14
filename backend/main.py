from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import User, Note
from pydantic import BaseModel
import hashlib

from jose import jwt
from datetime import datetime, timedelta

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all (for now)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

Base.metadata.create_all(bind=engine)

SECRET = "mysecret"

# DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Models
class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class NoteRequest(BaseModel):
    title: str
    content: str

# Home
@app.get("/")
def home():
    return {"message": "server running"}

# Register
@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.username == request.username).first()
    if user:
        raise HTTPException(status_code=400, detail="User exists")

    hashed = hashlib.sha256((request.password + "salt123").encode()).hexdigest()

    new_user = User(username=request.username, password=hashed)
    db.add(new_user)
    db.commit()

    return {"message": "registered"}

# Login
@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid")

    hashed = hashlib.sha256((request.password + "salt123").encode()).hexdigest()

    if user.password != hashed:
        raise HTTPException(status_code=401, detail="Invalid")

    payload = {
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }

    token = jwt.encode(payload, SECRET, algorithm="HS256")

    return {"access_token": token}

# Create Note
@app.post("/notes")
def create_note(
    request: NoteRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    user_id = payload.get("user_id")

    note = Note(
        title=request.title,
        content=request.content,
        user_id=user_id
    )

    db.add(note)
    db.commit()

    return {"message": "note created"}

# Get Notes
@app.get("/notes")
def get_notes(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    user_id = payload.get("user_id")

    notes = db.query(Note).filter(Note.user_id == user_id).all()

    return notes