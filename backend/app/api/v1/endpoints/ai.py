from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from typing import Any, Dict, Optional
import json
import structlog
from app.schemas.ai import (
    AIRequest, 
    SmartNotesResponse,
    ResourceFinderResponse,
    ResumeAnalysisResponse,
    InterviewPrepRequest,
    InterviewPrepResponse,
    AIPodcastRequest,
    AIPodcastResponse,
    AISearchResponse
)
from app.schemas.base import ResponseModel
from app.services.ai_service import ai_service
from app.utils.file_extraction import extract_text_from_file
from app.api.deps import get_current_user, CurrentUser as User
from app.services.history_service import history_service
from app.services.history_service import history_service

logger = structlog.get_logger(__name__)

router = APIRouter()

@router.post("/assistant", response_model=ResponseModel[Dict[str, Any]])
async def ai_assistant_main(
    type: str = Form(..., description="The feature type (e.g., 'smart-notes')"),
    content: Optional[str] = Form(None, description="The user input material"),
    context: Optional[str] = Form(None, description="Optional background context"),
    file: Optional[UploadFile] = File(None, description="Optional uploaded source file"),
    current_user: User = Depends(get_current_user)
):
    """
    Main aggregator for all AI assistant features.
    Delegates to service layer based on 'type'.
    Supports both direct text inputs and file uploads (pdf, docx, txt, images).
    """
    try:
        logger.info("AI assistant request received", feature=type, has_file=bool(file))
        
        # Centralized Extractor Logic for File Inputs
        final_content = content or ""
        if file:
            try:
                extracted = await extract_text_from_file(file)
                final_content = f"{final_content}\n\n{extracted}".strip()
            except Exception as e:
                return ResponseModel(status="error", message=f"File extraction failed: {str(e)}")
                
        if not final_content:
            return ResponseModel(status="error", message="Please provide either text content or upload a valid file.")
        
        parsed_context = {}
        if context:
            try:
                parsed_context = json.loads(context)
            except Exception:
                pass
                
        # Dispatch logic based on feature type
        if type == "smart-notes":
            result = await ai_service.get_smart_notes(final_content)
        elif type == "study-planner":
            result = await ai_service.generate_study_plan(final_content, parsed_context)
        elif type == "resource-finder":
            result = await ai_service.find_learning_resources(final_content)
        elif type == "ai-search":
            result = await ai_service.get_ai_search(final_content)
        else:
            result = await ai_service.generic_feature_handler(type, final_content, parsed_context)

        if "error" in result:
            return ResponseModel(status="error", error=result["error"], message="AI processing failed")

        # History Auto-Save
        history_service.save_history(
            user_id=current_user.id,
            token=current_user.token,
            feature_name=type,
            input_data={"content": final_content, "context": parsed_context, "has_file": bool(file)},
            output_data=result
        )

        return ResponseModel(data=result, message=f"Generated {type}")

    except Exception as e:
        logger.exception("Error in assistant endpoint")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/resume/analyze", response_model=ResponseModel[ResumeAnalysisResponse])
async def analyze_resume(
    resume: Optional[UploadFile] = File(None),
    resume_text: Optional[str] = Form(None),
    job_description: Optional[UploadFile] = File(None),
    job_description_text: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """
    Detailed ATS comparison between resume and job description.
    """
    try:
        # Extraction logic
        final_resume_text = resume_text or ""
        if resume:
            final_resume_text = f"{final_resume_text}\n{await extract_text_from_file(resume)}".strip()
            
        final_jd_text = job_description_text or ""
        if job_description:
            final_jd_text = f"{final_jd_text}\n{await extract_text_from_file(job_description)}".strip()

        if not final_resume_text or not final_jd_text:
            return ResponseModel(status="error", message="Missing resume or job description content")

        result = await ai_service.analyze_resume_against_jd(final_resume_text, final_jd_text)
        
        if "error" in result:
            return ResponseModel(status="error", error=result["error"])

        # History Auto-Save
        history_service.save_history(
            user_id=current_user.id,
            token=current_user.token,
            feature_name="resume-analyzer",
            input_data={"resume_text": final_resume_text, "jd_text": final_jd_text},
            output_data=result
        )

        return ResponseModel(data=result)

    except Exception as e:
        logger.exception("Resume analysis failure")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/interview/prep", response_model=ResponseModel[InterviewPrepResponse])
async def interview_prep(
    request: InterviewPrepRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate role-specific interview preparation materials.
    """
    try:
        result = await ai_service.generate_interview_prep(
            role=request.role,
            experience=request.experience_level,
            tech_stack=request.tech_stack
        )
        if "error" in result:
            return ResponseModel(status="error", error=result["error"])

        # History Auto-Save
        history_service.save_history(
            user_id=current_user.id,
            token=current_user.token,
            feature_name="interview-prep",
            input_data={"role": request.role, "experience": request.experience_level, "tech_stack": request.tech_stack},
            output_data=result
        )

        return ResponseModel(data=result)
    except Exception as e:
        logger.exception("Interview prep failure")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/podcast/generate", response_model=ResponseModel[AIPodcastResponse])
async def generate_podcast(
    topic: Optional[str] = Form(None),
    host_gender: str = Form("Male"),
    guest_gender: str = Form("Female"),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a conversation script based on host/guest gender selection.
    Supports either direct topic text or a rich uploaded document.
    """
    try:
        final_topic = topic or ""
        if file:
            try:
                extracted = await extract_text_from_file(file)
                final_topic = f"{final_topic}\n\n{extracted}".strip()
            except Exception as e:
                return ResponseModel(status="error", message=f"File extraction failed: {str(e)}")
                
        if not final_topic:
            return ResponseModel(status="error", message="Please provide a topic or upload a file.")

        result = await ai_service.generate_ai_podcast(
            content=final_topic,
            host_gender=host_gender,
            guest_gender=guest_gender
        )
        if "error" in result:
            return ResponseModel(status="error", error=result["error"])

        # History Auto-Save
        history_service.save_history(
            user_id=current_user.id,
            token=current_user.token,
            feature_name="ai-podcast",
            input_data={"topic_summary": (final_topic[:200] + "...") if len(final_topic) > 200 else final_topic},
            output_data=result
        )

        return ResponseModel(data=result)
    except Exception as e:
        logger.exception("Podcast generation failure")
        raise HTTPException(status_code=500, detail=str(e))

from app.schemas.ai import (
    MockInterviewStartRequest,
    MockInterviewNextRequest,
    MockInterviewResponse,
    MockInterviewReviewResponse
)
from app.services.storage_service import storage_service

# ---- MOCK INTERVIEW ENDPOINTS ----
@router.post("/mock-interview/start", response_model=ResponseModel[MockInterviewResponse])
async def start_mock_interview(
    request: MockInterviewStartRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        result = await ai_service.start_mock_interview(
            role=request.role,
            difficulty=request.difficulty,
            round_type=request.round_type,
            num_questions=request.num_questions,
            avatar=request.interviewer_avatar
        )
        if "error" in result:
            return ResponseModel(status="error", error=result["error"])
            
        history_service.save_history(
            user_id=current_user.id,
            token=current_user.token,
            feature_name="mock-interview-start",
            input_data={"role": request.role, "difficulty": request.difficulty, "session_id": result.get("session_id")},
            output_data=result
        )
        return ResponseModel(data=result)
    except Exception as e:
        logger.exception("Mock Interview Start Failure")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mock-interview/next", response_model=ResponseModel[MockInterviewResponse])
async def next_mock_interview_turn(
    request: MockInterviewNextRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        result = await ai_service.next_mock_interview_turn(request.session_id, request.user_answer)
        if "error" in result:
            return ResponseModel(status="error", error=result["error"])
        return ResponseModel(data=result)
    except Exception as e:
        logger.exception("Mock Interview Next Turn Failure")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mock-interview/review", response_model=ResponseModel[MockInterviewReviewResponse])
async def get_mock_interview_review(
    session_id: str = Form(...),
    video: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    try:
        result = await ai_service.get_mock_interview_review(session_id)
        if "error" in result:
            return ResponseModel(status="error", error=result["error"])
            
        video_metadata = {}
        if video:
            saved_path = await storage_service.save_video(video)
            video_url = f"/api/v1/media/{saved_path}"
            result["video_url"] = video_url
            video_metadata = {"video_filename": video.filename, "video_url": video_url, "status": "saved"}
            
        history_service.save_history(
            user_id=current_user.id,
            token=current_user.token,
            feature_name="mock-interview-review",
            input_data={"session_id": session_id, "video_capture": video_metadata},
            output_data=result
        )
        return ResponseModel(data=result)
    except Exception as e:
        logger.exception("Mock Interview Review Failure")
        raise HTTPException(status_code=500, detail=str(e))

# Remaining endpoints...
