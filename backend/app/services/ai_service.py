import structlog
import uuid
from typing import Dict, Any, List, Optional, Union
from app.providers.groq import groq_provider
from app.core.config import settings

logger = structlog.get_logger(__name__)

class AIService:
    """
    Core AI orchestration logic using isolated Groq provider.
    Handles prompt engineering, feature logic, and response normalization.
    """
    
    def __init__(self):
        # In-memory session store for Mock Interviews (Since Auth/DB is out of scope)
        self.mock_sessions: Dict[str, Dict[str, Any]] = {}

    async def get_smart_notes(self, content: str) -> Dict[str, Any]:
        """
        Processes content with proportional length requirements.
        Classifies input size to adjust summary and key points density.
        """
        word_count = len(content.split())
        is_big = word_count > 1000
        
        size_prompt = (
            "This is a BIG input. Output approx 15-20 lines of summary and 30-35 key points." 
            if is_big else 
            "This is a SMALL input. Output approx 5-10 lines of summary and 10-15 key points."
        )

        system_prompt = (
            "You are an expert educational content creator and study assistant. "
            "Analyze the provided text and distill it into highly dense, information-rich revision notes. "
            "SUMMARY: Create a comprehensive executive summary that captures the core meaning and prioritizes vital concepts. "
            "Do not use vague phrases like 'This topic is important'. Avoid repetitive or shallow filler. "
            "KEY POINTS: Extract crisp, distinct, and non-overlapping bullet points. Each point must convey a specific "
            "fact, concept, definition, formula, or relationship. Avoid redundant ideas. "
            f"{size_prompt} "
            "Respond ONLY with a JSON object. NO flashcards. "
            "JSON SCHEMA: {'summary': string, 'key_points': list of strings}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Content: {content}"}
        ]

        logger.info("Generating smart notes", is_big=is_big, words=word_count)
        return await groq_provider.chat_completion(messages=messages, model=settings.GROQ_HIGH_CAPACITY_MODEL)

    async def generate_study_plan(self, content: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Builds rigorous academic study plans matching duration and difficulty.
        """
        days = context.get('days', 7)
        difficulty = context.get('difficulty', 'medium')

        system_prompt = f"""You are an academic planning assistant.

INPUT:
- Syllabus content (raw text or extracted from files)
- Additional study material content (optional)
- Difficulty mode: {difficulty}
- Total number of days available: {days}

TASK:
1. Extract and organize the syllabus into subjects → units → topics.
2. If structure is unclear, infer a clean structure from the content.
3. Generate a complete day-by-day study plan that covers the full syllabus within the given number of days.
4. Adjust workload strictly based on difficulty:
   - easy: lighter daily load, more spacing, include more revision days
   - medium: balanced workload and revision
   - hard: dense schedule, minimal spacing, faster coverage
5. Ensure:
   - No topic is skipped
   - Logical sequencing of topics
   - Revision is included appropriately based on difficulty

OUTPUT FORMAT (STRICT JSON ONLY, NO EXTRA TEXT):
{{
  "subjects": [
    {{
      "name": "string",
      "units": [
        {{
          "title": "string",
          "topics": ["string"]
        }}
      ]
    }}
  ],
  "plan": [
    {{
      "day": 1,
      "tasks": ["string"],
      "revision": false
    }}
  ]
}}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Syllabus Content:\n{content}"}
        ]

        logger.info("Generating study plan", days=days, difficulty=difficulty)
        return await groq_provider.chat_completion(messages=messages, model=settings.GROQ_HIGH_CAPACITY_MODEL)

    async def analyze_resume_against_jd(self, resume_text: str, jd_text: str) -> Dict[str, Any]:
        """
        Compares candidate resume vs job requirements for ATS alignment.
        """
        system_prompt = (
            "You are a rigorous Senior Technical Recruiter and Application Tracking System (ATS) expert. "
            "Analyze the provided RESUME against the JOB DESCRIPTION (JD). "
            "MATCH SCORE: Provide a realistic, reasoned match percentage based on concrete skill & experience alignment. "
            "SKILLS: Precisely extract 'matched_skills' and clearly identify core 'missing_skills'. "
            "SUGGESTIONS: Provide highly actionable, category-based advice (e.g., technical gaps, missing quantified impact, formatting clarity). Avoid generic advice like 'improve your resume'. "
            "ATS FEEDBACK: Provide realistic feedback on keyword density, role-tailoring, and action-verb usage. "
            "VERDICT: Give a decisive, recruiter-aware final verdict (e.g., 'Strongly Aligned', 'Moderate - Needs Tailoring', 'Weak'). "
            "Respond ONLY with a JSON object containing: "
            "'match_score': int(0-100), 'matched_skills': list of strings, 'missing_skills': list of strings, "
            "'improvement_suggestions': list of strings, 'ats_feedback': string, 'verdict': string."
        )

        user_content = f"### JD:\n{jd_text}\n\n### RESUME:\n{resume_text}"
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        logger.info("Analyzing resume vs jd")
        return await groq_provider.chat_completion(messages=messages, model=settings.GROQ_HIGH_CAPACITY_MODEL)

    async def generate_interview_prep(self, role: str, experience: str, tech_stack: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates role-specific questions and model answers.
        """
        system_prompt = (
            f"You are a Principal Engineer and Hiring Manager conducting a technical interview for a {experience} {role}. "
            "Create a rigorous, highly relevant interview preparation guide. "
            "QUESTIONS: Provide 10 specific, challenging questions mixing conceptual, practical, and scenario-based inquiries. Avoid basic generic fluff. "
            "MODEL ANSWERS: Provide strong, professional, and clear model answers for each question that demonstrate deep understanding. "
            "FOCUS AREAS: Identify 5 critical topics or technologies the candidate must master for this specific role. "
            "Respond ONLY with a JSON object containing: "
            "'interview_questions': list of 10 strings, 'model_answers': list of 10 strings, 'focus_areas': list of 5 strings."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context: {tech_stack or 'General'}"}
        ]

        return await groq_provider.chat_completion(messages=messages)

    async def generate_ai_podcast(self, content: str, host_gender: str, guest_gender: str) -> Dict[str, Any]:
        """
        Creates a conversational podcast script with gender-specific dynamic scripts.
        """
        system_prompt = (
            f"You are a world-class podcast producer and scriptwriter. Create an engaging, educational podcast episode. "
            f"The Host is a {host_gender} who sets the stage, introduces concepts clearly, and asks curious questions. "
            f"The Guest is an expert {guest_gender} providing deep insights and real-world examples. "
            "SCRIPT RULES: Make the dialogue natural, conversational, and highly informative. Avoid robotic dialogue, repetitive banter, and fluffy filler. Ensure a smooth intro, a substantive main discussion with examples, and a clear recap."
            "Respond ONLY with a JSON object containing: "
            "'title': 'Episode Title', "
            "'topic': 'Brief topic summary', "
            f"'host_gender': '{host_gender}', "
            f"'guest_gender': '{guest_gender}', "
            "'script': 'Full readable transcript as a single string', "
            "'dialogue_turns': list of objects [{'speaker': 'Host' or 'Guest', 'text': 'spoken content', 'instruction': 'emotion/tone cue'}], "
            "'playback_ready': true, "
            "'audio_status': 'browser_tts_ready'"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Content to discuss: {content}"}
        ]

        return await groq_provider.chat_completion(messages=messages, model=settings.GROQ_HIGH_CAPACITY_MODEL)

    async def find_learning_resources(self, topic: str) -> Dict[str, Any]:
        """
        Finds accurate articles, docs, and videos. NO vague links.
        """
        system_prompt = (
            "You are a technical knowledge curator. Based on the user's query, recommend highly relevant, trustworthy, and practical learning resources. "
            "RESOURCES MUST BE REAL: Prioritize official documentation (e.g., MDN, React Docs), verifiable educational platforms (Coursera, Udemy), and well-known repositories. "
            "DESCRIPTION: Provide a concise, specific explanation of WHY this resource is useful and what the user will learn. No generic filler. "
            "TYPES ALLOWED: 'article', 'video', 'repo', 'course', 'documentation'. "
            "Respond ONLY with a JSON object containing: "
            "{'resources': [{'title': 'string', 'url': 'string', 'type': 'string', 'description': 'string'}]}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Topic: {topic}"}
        ]

        return await groq_provider.chat_completion(messages=messages)

    async def get_ai_search(self, query: str) -> Dict[str, Any]:
        """
        Deep knowledge synthesis for a specific query.
        """
        system_prompt = (
            "You are an elite research analyst and knowledge engine. Provide a deep, structured, and highly informative answer. "
            "STRUCTURE: Organize your answer logically using headers like Overview, Key Details, and Practical Takeaways. "
            "QUALITY: Be direct and topic-focused. Eliminate vague rambling and filler words. Use clear markdown formatting. "
            "SOURCES: List plausible, authoritative real-world sources or documentation references that back up your answer. "
            "Respond ONLY with a JSON object containing: "
            "{'answer': 'Markdown structured string', 'sources': ['Source 1', 'Source 2'], 'structured_content': {}}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Query: {query}"}
        ]

        return await groq_provider.chat_completion(messages=messages)

    async def start_mock_interview(self, role: str, difficulty: str, round_type: str, num_questions: int, avatar: str) -> Dict[str, Any]:
        """Starts a local session for a video-call styled AI mock interview."""
        session_id = str(uuid.uuid4())
        
        # Cleanly separated session state structure
        self.mock_sessions[session_id] = {
            "config": {
                "role": role,
                "difficulty": difficulty,
                "round_type": round_type,
                "num_questions": num_questions,
                "avatar": avatar
            },
            "state": {
                "current_question_index": 1,
                "is_complete": False
            },
            "transcript": [] 
        }
        
        system_prompt = (
            f"You are {avatar}, an experienced human interviewer. We are doing a {difficulty} {round_type} interview for a {role} position. "
            "Start the interview. Be extremely natural and conversational, not robotic. "
            "Introduce yourself smoothly, briefly acknowledge the role, and ask the FIRST core question to kick things off. "
            f"CRITICAL: Tailor the question specifically to the {difficulty} level. If 'Hard', ask a complex, multi-layered scenario. If 'Easy', stick to foundational concepts. Align perfectly with the {round_type} focus. "
            "Respond ONLY with JSON: {'ai_reaction': 'Short human greeting', 'ai_question': 'The first question'}"
        )
        
        messages = [{"role": "system", "content": system_prompt}]
        response = await groq_provider.chat_completion(messages=messages)
        
        if "error" not in response:
            self.mock_sessions[session_id]["transcript"].extend([
                {"role": "ai_reaction", "text": response.get("ai_reaction", "")},
                {"role": "ai_question", "text": response.get("ai_question", "")}
            ])
            
        return {
            "session_id": session_id,
            "question_number": 1,
            "ai_reaction": response.get("ai_reaction", f"Hello. I'll be your interviewer for the {role} position today."),
            "ai_question": response.get("ai_question", "Could you start by telling me a little bit about your background?"),
            "is_complete": False
        }

    async def next_mock_interview_turn(self, session_id: str, user_answer: str) -> Dict[str, Any]:
        """Evaluates the user's answer, generates a natural transition reaction, and poses the next relevant question."""
        session = self.mock_sessions.get(session_id)
        if not session or session["state"]["is_complete"]:
            return {"error": "Invalid or expired session. Please start a new interview."}
            
        session["transcript"].append({"role": "user_answer", "text": user_answer})
        session["state"]["current_question_index"] += 1
        
        if session["state"]["current_question_index"] > session["config"]["num_questions"]:
            session["state"]["is_complete"] = True
            session["transcript"].append({"role": "ai_reaction", "text": "Thank you for sharing. That concludes our interview."})
            return {
                "session_id": session_id,
                "question_number": session["state"]["current_question_index"],
                "ai_reaction": "Thank you for all your detailed answers today. We are out of time, so that concludes our interview. I will prepare your feedback now.",
                "ai_question": "",
                "is_complete": True
            }
            
        history_text = "\n".join([f"[{item['role']}] {item['text']}" for item in session["transcript"]])
        
        # Silence and intelligent follow-up prompt
        system_prompt = (
            f"You are conducting a {session['config']['difficulty']} {session['config']['round_type']} interview for a {session['config']['role']} role. "
            "Analyze the transcript realistically. "
            "If the user implies silence or an audio failure (e.g., '(User stayed silent)'), gently ask: 'Are you still with me?' or 'Did you catch the question?'. "
            "If the user answered the question: "
            "1. REACTION: Provide a VERY short, human-like acknowledgment tailored to what they actually said (e.g., 'Right, indexing helps there', 'That is a fair point'). DO NOT use robotic repeated phrases. "
            "2. NEXT QUESTION: Decide smartly based on the answer. "
            "  - FOLLOW-UP: ONLY ask a follow-up if their answer introduced a strong, specific technical/behavioral point that warrants deeper probing, OR if they completely misunderstood and you need to briefly redirect them. Keep follow-ups short. "
            f"  - NEW QUESTION: Otherwise, pivot smoothly to a completely NEW topic relevant to the {session['config']['role']} role. Ensure the new question strictly matches the {session['config']['difficulty']} complexity and {session['config']['round_type']} focus. "
            "Respond ONLY with JSON: {'ai_reaction': 'Short authentic reaction', 'ai_question': 'Your next question or follow-up'}"
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Interview Transcript so far:\n{history_text}\n\nThe user just answered. React appropriately and ask the next question."}
        ]
        
        response = await groq_provider.chat_completion(messages=messages, model=settings.GROQ_HIGH_CAPACITY_MODEL)
        
        if "error" not in response:
            session["transcript"].extend([
                {"role": "ai_reaction", "text": response.get("ai_reaction", "")},
                {"role": "ai_question", "text": response.get("ai_question", "")}
            ])
            
        return {
            "session_id": session_id,
            "question_number": session["state"]["current_question_index"],
            "ai_reaction": response.get("ai_reaction", "Got it. Let's move on."),
            "ai_question": response.get("ai_question", "Can you explain the next core concept of the technical requirement?"),
            "is_complete": False
        }

    async def get_mock_interview_review(self, session_id: str) -> Dict[str, Any]:
        """Analyzes the full session transcript to generate rigorous multidimensional feedback."""
        session = self.mock_sessions.get(session_id)
        if not session or not session["transcript"]:
            return {"error": "Invalid session or no transcipt recorded."}
            
        history_text = "\n".join([f"[{item['role']}] {item['text']}" for item in session["transcript"]])
        
        system_prompt = (
            "You are an elite Interview Assessor. Analyze this interview transcript and evaluate the candidate deeply. "
            "VITAL RULES: "
            "1. Ignore minor transcript errors, stuttering, or speech-to-text (STT) transcription noise. Focus strictly on the underlying intended logic, technical accuracy, and structural communication quality. Do not over-penalize grammar. "
            "2. Keep the 'overall_review' pragmatic. For 'weaknesses', list ONLY the top 2-3 most critical areas of improvement rather than a vague bucket list. "
            "3. The 'roadmap' must be a highly practical, 2-to-3 step process for them to improve. "
            "Respond ONLY with a JSON object containing: "
            "'question_wise_review': list of dicts [{"
            "'question': 'Exact interviewer question', "
            "'user_answer_summary': 'Accurate summary of their meaning', "
            "'correctness': 'How factually/logically right they were', "
            "'clarity': 'How well structured their explanation was', "
            "'depth': 'Did they show deep expertise or shallow knowledge', "
            "'improve': 'Specific, actionable improvement advice', "
            "'score': int(0-10)}], "
            "'overall_review': dict {'communication': 'Specific communication evaluation', 'technical_knowledge': 'Evaluation of overall depth/correctness', 'confidence': 'Delivery evaluation', 'strengths': ['Distinct strength 1', ...], 'weaknesses': ['Top critical weakness 1', ...], 'verdict': 'Clear realistic verdict', 'roadmap': 'Short pragmatic next steps'}"
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze this full Interview Transcript:\n{history_text}"}
        ]
        
        return await groq_provider.chat_completion(messages=messages, model=settings.GROQ_HIGH_CAPACITY_MODEL)

    async def generic_feature_handler(self, feature_type: str, content: str, context: dict = None) -> Dict[str, Any]:
        """
        Legacy/Generic dispatcher for simple one-off features.
        """
        # Mapping simple features to internal specialized methods
        if feature_type == "smart-notes":
            return await self.get_smart_notes(content)
        elif feature_type == "resource-finder":
            return await self.find_learning_resources(content)
        elif feature_type == "ai-search":
            return await self.get_ai_search(content)
        
        logger.error("Unsupported feature type in generic handler", feature=feature_type)
        return {"error": f"Unsupported or on-hold feature: {feature_type}"}

# Singleton Instance
ai_service = AIService()
