import structlog
from typing import Dict, List, Any
from collections import Counter
from app.api.deps import supabase_admin
from fastapi import HTTPException, status

logger = structlog.get_logger(__name__)

class AnalyticsReadService:
    """
    Read-only service for aggregating and summarizing telemetry data.
    All logic is fail-safe to protect admin dashboard stability.
    """

    def _verify_admin_client(self):
        if not supabase_admin:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server configuration error. Admin client unavailable."
            )

    def get_summary(self) -> Dict[str, Any]:
        self._verify_admin_client()
        try:
            # 1. Total events
            total_response = supabase_admin.table("analytics_events").select("*", count="exact", head=True).execute()
            total_events = total_response.count if total_response.count is not None else 0

            # 2. Total admin events
            admin_response = supabase_admin.table("analytics_events").select("*", count="exact", head=True).eq("module", "admin").execute()
            admin_events = admin_response.count if admin_response.count is not None else 0

            # 3. Total history events
            history_response = supabase_admin.table("analytics_events").select("*", count="exact", head=True).eq("module", "history").execute()
            history_events = history_response.count if history_response.count is not None else 0

            # 4. Total users tracked
            users_response = supabase_admin.table("analytics_events").select("user_id").execute()
            distinct_users = len(set(ev.get("user_id") for ev in users_response.data if ev.get("user_id")))

            return {
                "total_events": total_events,
                "admin_events": admin_events,
                "history_events": history_events,
                "distinct_users": distinct_users
            }
        except Exception as e:
            logger.error("Failed to fetch analytics summary", error=str(e))
            return {"error": "Aggregation failure"}

    def get_by_module(self) -> List[Dict[str, Any]]:
        self._verify_admin_client()
        try:
            response = supabase_admin.table("analytics_events").select("module").execute()
            counts = Counter(ev.get("module", "unknown") for ev in response.data)
            return [{"module": m, "count": c} for m, c in counts.most_common()]
        except Exception as e:
            logger.error("Failed to fetch analytics by module", error=str(e))
            return []

    def get_by_event(self) -> List[Dict[str, Any]]:
        self._verify_admin_client()
        try:
            response = supabase_admin.table("analytics_events").select("event_type").execute()
            counts = Counter(ev.get("event_type", "unknown") for ev in response.data)
            return [{"event_type": e, "count": c} for e, c in counts.most_common()]
        except Exception as e:
            logger.error("Failed to fetch analytics by event", error=str(e))
            return []

    def get_recent_activity(self, limit: int = 25) -> List[Dict[str, Any]]:
        self._verify_admin_client()
        try:
            response = supabase_admin.table("analytics_events")\
                .select("id, event_type, module, user_id, created_at, metadata")\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            # Truncate metadata for safety
            for event in response.data:
                meta = event.get("metadata", {})
                if meta:
                    meta_str = str(meta)
                    if len(meta_str) > 60:
                        event["metadata_preview"] = meta_str[:57] + "..."
                    else:
                        event["metadata_preview"] = meta_str
                else:
                    event["metadata_preview"] = "-"
                
                # Remove full metadata to keep payload small
                event.pop("metadata", None)

            return response.data
        except Exception as e:
            logger.error("Failed to fetch recent activity", error=str(e))
            return []

# Singleton Instance
analytics_read_service = AnalyticsReadService()
