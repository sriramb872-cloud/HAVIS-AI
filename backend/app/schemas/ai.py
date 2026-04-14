from typing import List, Optional, Dict, Any
from pydantic import Field, HttpUrl
from app.schemas.base import BaseSchema

# Generic Assistant Request
class AIRequest(BaseSchema):
    type: str = Field(..., description="The feature type (e.g., 'smart-notes', 'resource-finder')")
    content: str = Field(..., min_length=1, description="The user input material")
    context: Optional[str] = Field(None, description="Optional background context")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Fine-tuning params")

# 1. Smart Notes Outputs
class SmartNotesResponse(BaseSchema):
    summary: str = Field(..., description="Proportional summary of content")
    key_points: List[str] = Field(..., description="Proportional major concepts")

# 2. Resume Analyzer
class ResumeAnalysisResponse(BaseSchema):
    match_score: int = Field(..., ge=0, le=100)
    matched_skills: List[str]
    missing_skills: List[str]
    improvement_suggestions: List[str]
    ats_feedback: str
    verdict: str

# 3. Interview Prep (Generation)
class InterviewPrepRequest(BaseSchema):
    role: str
    experience_level: str
    tech_stack: Optional[str] = None

class InterviewPrepResponse(BaseSchema):
    interview_questions: List[str]
    model_answers: List[str]
    focus_areas: List[str]

# 4. AI Podcast
class AIPodcastRequest(BaseSchema):
    topic: str
    host_gender: str = "Male"
    guest_gender: str = "Female"

class DialogueTurn(BaseSchema):
    speaker: str
    text: str
    instruction: str

class AIPodcastResponse(BaseSchema):
    title: str = Field(..., description="Podcast episode title")
    topic: str = Field(..., description="The context topic")
    host_gender: str
    guest_gender: str
    script: str = Field(..., description="Engaging conversation script")
    dialogue_turns: List[DialogueTurn] = Field(..., description="Structure for narration-ready flow")
    playback_ready: bool = True
    audio_status: str = "browser_tts_ready"

# 5. Resource Finder
class ResourceItem(BaseSchema):
    title: str
    url: str
    type: str  # article, video, repo, course
    description: str

class ResourceFinderResponse(BaseSchema):
    resources: List[ResourceItem]

# 6. AI Search
class AISearchResponse(BaseSchema):
    answer: str
    sources: Optional[List[str]] = None
    structured_content: Optional[Dict[str, Any]] = None

# ---- HELD/UNUSED SCHEMAS (Architecture Placeholders) ----

# Mock Interview (Real-time Session)
class MockInterviewStartRequest(BaseSchema):
    role: str
    difficulty: str
    round_type: str
    num_questions: int
    interviewer_avatar: str

class MockInterviewNextRequest(BaseSchema):
    session_id: str
    user_answer: str

class MockInterviewResponse(BaseSchema):
    session_id: str
    question_number: int
    ai_reaction: str
    ai_question: str
    is_complete: bool

class QuestionReview(BaseSchema):
    question: str
    user_answer_summary: str
    correctness: str
    clarity: str
    depth: str
    improve: str
    score: int

class MockInterviewReviewResponse(BaseSchema):
    question_wise_review: List[QuestionReview]
    overall_review: Dict[str, Any]
    video_url: Optional[str] = None

# Study Planner (Held)
class StudyPlanResponse(BaseSchema):
    daily_schedule: List[Dict[str, Any]]
    recommended_order: List[str]
    learning_tips: List[str]
