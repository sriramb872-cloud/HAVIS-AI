import structlog
from typing import Dict, Any, Optional
from app.api.deps import supabase_admin
from datetime import datetime

logger = structlog.get_logger(__name__)

class AnalyticsService:
    """
    Fail-safe analytics service for append-only telemetry.
    Ensures that analytics failures never disrupt the main application flow.
    """

    def track_event(
        self, 
        user_id: Optional[str], 
        event_type: str, 
        module: str, 
        metadata: Dict[str, Any] = None
    ):
        """
        Record a general telemetry event to public.analytics_events.
        """
        if not supabase_admin:
            logger.warning("Analytics skipped: supabase_admin client not initialized")
            return

        try:
            payload = {
                "user_id": user_id,
                "event_type": event_type,
                "module": module,
                "metadata": metadata or {},
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Using service role for reliable append-only write
            supabase_admin.table("analytics_events").insert(payload).execute()
            logger.info("Analytics event tracked", event_type=event_type, module=module, user_id=user_id)
            
        except Exception as e:
            # SHIELD: Swallow all exceptions to protect the main request flow
            logger.error("Analytics tracking failure (swallowed)", error=str(e), event_type=event_type)

    def track_ai_usage(
        self, 
        user_id: Optional[str], 
        provider: str, 
        model: str, 
        prompt_tokens: int = 0, 
        completion_tokens: int = 0, 
        latency_ms: int = 0
    ):
        """
        Record AI usage metrics to public.ai_usage_logs.
        (Helper implemented for foundation; unused in Phase 5 reduced scope)
        """
        if not supabase_admin:
            logger.warning("AI usage analytics skipped: supabase_admin client not initialized")
            return

        try:
            payload = {
                "user_id": user_id,
                "provider": provider,
                "model": model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "latency_ms": latency_ms,
                "created_at": datetime.utcnow().isoformat()
            }
            
            supabase_admin.table("ai_usage_logs").insert(payload).execute()
            logger.info("AI usage tracked", provider=provider, model=model, user_id=user_id)
            
        except Exception as e:
            # SHIELD: Swallow all exceptions to protect the main request flow
            logger.error("AI usage tracking failure (swallowed)", error=str(e), provider=provider)

# Singleton Instance
analytics_service = AnalyticsService()
