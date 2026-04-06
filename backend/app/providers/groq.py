import os
import json
import asyncio
from typing import Dict, Any, Optional, Union, List, AsyncGenerator
import structlog
from groq import AsyncGroq, GroqError
from app.core.config import settings

logger = structlog.get_logger(__name__)

class GroqProvider:
    """
    Isolated provider for Groq API.
    Handles communication, retries, and formatting.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        if not self.api_key:
            logger.error("Groq API key not provided!")
            raise ValueError("GROQ_API_KEY is missing in settings")
        
        self.client = AsyncGroq(api_key=self.api_key)

    async def chat_completion(
        self, 
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = True
    ) -> Dict[str, Any]:
        """
        Request standard chat completion from Groq.
        """
        model = model or settings.GROQ_DEFAULT_MODEL
        temperature = temperature if temperature is not None else settings.GROQ_TEMPERATURE
        max_tokens = max_tokens or settings.GROQ_MAX_TOKENS
        
        # Enforce JSON mode format
        response_format = {"type": "json_object"} if json_mode else None
        
        try:
            logger.info("Initializing Groq chat completion", model=model, json_mode=json_mode)
            
            # Phase 1: Timeout Protection
            completion = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format=response_format
                ),
                timeout=20.0 # Strict timeout for AI responses
            )
            
            content = completion.choices[0].message.content
            
            if json_mode:
                # Normalization: Aggressively strip markdown wrappers to prevent JSONDecodeError
                cleaned_content = content.strip()
                if cleaned_content.startswith("```"):
                    # Find the first { or [ and last } or ]
                    start_idx = cleaned_content.find("{")
                    end_idx = cleaned_content.rfind("}")
                    
                    if start_idx == -1 or end_idx == -1:
                        # Fallback for arrays
                        start_idx = cleaned_content.find("[")
                        end_idx = cleaned_content.rfind("]")
                        
                    if start_idx != -1 and end_idx != -1:
                        cleaned_content = cleaned_content[start_idx:end_idx+1]
                
                try:
                    return json.loads(cleaned_content)
                except json.JSONDecodeError as decode_err:
                    logger.error("Malformed JSON response from AI", error=str(decode_err), content=content, cleaned=cleaned_content)
                    return {"error": "AI returned malformed JSON structure.", "raw": content}
            
            return {"content": content}
            
        except asyncio.TimeoutError:
            logger.error("AI Request Timed Out", model=model)
            return {"error": "AI request timed out. Please try again."}
        except GroqError as e:
            error_msg = str(e)
            logger.error("Groq Provider API Error", error=error_msg)
            
            # Specific handling for decommissioned models
            if "model" in error_msg.lower() and ("not found" in error_msg.lower() or "deprecated" in error_msg.lower() or "400" in error_msg):
                return {"error": "The AI model is currently undergoing maintenance or has been updated. Please try again in a moment."}
                
            return {"error": "AI Service is temporarily unavailable. Please try again later."}
        except Exception as e:
            logger.exception("Unexpected error in Groq Provider")
            return {"error": "An internal error occurred. Please try again later."}

    async def stream_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Future-proof: Async generator for streaming responses.
        (Planned feature, implemented for architecture scalability)
        """
        model = model or settings.GROQ_DEFAULT_MODEL
        
        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error("Streaming error", error=str(e))
            yield f"Error: {str(e)}"

# Singleton Instance
groq_provider = GroqProvider()
