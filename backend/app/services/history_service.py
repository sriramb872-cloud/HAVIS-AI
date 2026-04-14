from datetime import datetime
from typing import Any, Dict, Optional, List
from supabase import create_client, ClientOptions
from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)

class HistoryService:
    def _get_scoped_client(self, token: str):
        return create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY,
            options=ClientOptions(headers={'Authorization': f'Bearer {token}'})
        )

    def save_history(
        self, 
        user_id: str, 
        feature_name: str, 
        token: str,
        input_data: Dict[str, Any] = None, 
        output_data: Dict[str, Any] = None,
        metadata: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        try:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            payload = {
                "user_id": user_id,
                "feature_name": feature_name,
                "date": today,
                "input_data": input_data or {},
                "output_data": output_data or {},
                "metadata": metadata or {}
            }
            
            client = self._get_scoped_client(token)
            response = client.table("history").insert(payload).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error("Failed to save history to Supabase", error=str(e), feature=feature_name, exc_info=True)
            raise e  # Do not silence errors silently! Surface actual save failures

    def get_user_history(self, user_id: str, token: str, feature_name: Optional[str] = None, date: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            client = self._get_scoped_client(token)
            query = client.table("history").select("*").eq("user_id", user_id)
            if feature_name:
                query = query.eq("feature_name", feature_name)
            if date:
                query = query.eq("date", date)
            response = query.order("created_at", desc=True).execute()
            return response.data or []
        except Exception as e:
            logger.error("Failed to retrieve history from Supabase", error=str(e), exc_info=True)
            raise e

    def delete_history(self, history_id: str, user_id: str, token: str) -> bool:
        """
        Deletes a history record from Supabase.
        Uses the administrative client to bypass RLS potential conflicts while
        strictly enforcing ownership via filtering.
        """
        try:
            # Import administrative client from deps or initialize locally
            from app.api.deps import supabase as admin_client
            
            # Strict ownership enforcement with .eq("id", history_id).eq("user_id", user_id)
            response = admin_client.table("history").delete() \
                .eq("id", history_id) \
                .eq("user_id", user_id) \
                .execute()
            
            deleted_count = len(response.data) if response.data else 0
            
            logger.info(
                "History record deletion attempted",
                history_id=history_id,
                user_id=user_id,
                deleted_rows=deleted_count,
                success=deleted_count > 0
            )
            
            return deleted_count > 0
        except Exception as e:
            logger.error("Failed to delete history from Supabase", error=str(e), history_id=history_id, exc_info=True)
            raise e


history_service = HistoryService()
