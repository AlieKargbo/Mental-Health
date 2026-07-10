# main.py
import datetime
import uuid
from typing import List, Optional

# Third-party libraries
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel

# Local modules
from nlp_model import analyze_text

# Initialize the FastAPI application
app = FastAPI()

# --- Pydantic Models for Data Validation ---

class CheckinRequest(BaseModel):
    """Model for incoming user check-in data."""
    user_text: str

class CheckinResponse(BaseModel):
    """Model for data returned after a single check-in."""
    id: str
    timestamp: datetime.datetime
    sentiment_score: float
    anomaly_flag: bool
    support_message: Optional[str] = None
    user_text: Optional[str] = None
    anon_user_id: Optional[str] = None

# --- Helper Functions ---

def generate_support_message(sentiment_score: float, is_anomaly: bool) -> str:
    """Generates a supportive message (nudge) based on the analysis."""
    
    if is_anomaly:
        return (
            "⚠️ Significant Change Detected. Your recent entries show a notable dip below your typical baseline. "
            "Please reach out to a support professional or review your coping strategies. "
            "Remember: small steps are still progress."
        )

    if sentiment_score < 0.3:
        return (
            "🫂 It sounds like you are going through a difficult time. "
            "It's okay to feel overwhelmed. Focus on one small, manageable task today."
        )

    if sentiment_score < 0.6:
        return (
            "⚖️ A steady day is still a good day. If you feel stuck, try a short break or a mindfulness exercise. "
            "Keep an eye on how you feel tomorrow."
        )

    return (
        "✨ Great job! Your reflection shows a positive mindset. "
        "Take a moment to recognize what made today successful and carry that momentum forward."
    )


def normalize_anon_user_id(anon_user_id: Optional[str]) -> str:
    """Reuse the provided anonymous user id or generate a new one."""
    if anon_user_id and isinstance(anon_user_id, str) and anon_user_id.strip():
        return anon_user_id.strip()
    return str(uuid.uuid4())

# --- API Endpoints ---

@app.post("/checkin", response_model=CheckinResponse)
def submit_checkin(
    request: CheckinRequest,
    x_anon_user_id: Optional[str] = Header(None, alias="X-Anon-User-Id")
):
    """Process a check-in, run analysis, and return a response without storing data on the server."""
    try:
        analysis = analyze_text(request.user_text)
        is_anomaly = analysis["sentiment"] < 0.25
        support_message = generate_support_message(analysis["sentiment"], is_anomaly)
        user_id = normalize_anon_user_id(x_anon_user_id)

        return CheckinResponse(
            id=str(uuid.uuid4()),
            timestamp=datetime.datetime.now(),
            sentiment_score=analysis["sentiment"],
            anomaly_flag=is_anomaly,
            support_message=support_message,
            user_text=request.user_text,
            anon_user_id=user_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing check-in: {str(e)}")

@app.get("/timeline", response_model=List[CheckinResponse])
def get_timeline():
    """Return an empty timeline because persistence is now handled by browser localStorage."""
    return []

@app.get("/auth/anon")
def get_anon_auth(
    x_anon_user_id: Optional[str] = Header(None, alias="X-Anon-User-Id")
):
    """Issue or echo an anonymous user identifier for localStorage scoping."""
    user_id = normalize_anon_user_id(x_anon_user_id)
    return {"anon_user_id": user_id}

@app.get("/")
def health_check():
    return {"status": "healthy", "timestamp": datetime.datetime.now()}

# --- CORS Headers (Crucial for Hosting) ---
# Enable CORS for frontend development
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:3000", "https://aliekargbo.github.io/Mental-Health/"], # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)