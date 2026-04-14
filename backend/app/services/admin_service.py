import structlog
from app.api.deps import supabase_admin
from fastapi import HTTPException, status
from typing import Dict, List, Any

logger = structlog.get_logger(__name__)

class AdminService:
    def _verify_admin_client(self):
        if not supabase_admin:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server configuration error. Admin client unavailable."
            )

    def list_users(self) -> List[Dict[str, Any]]:
        self._verify_admin_client()
        try:
            response = supabase_admin.auth.admin.list_users()
            users = []
            
            # The SDK returns a list of User objects directly
            for user in response:
                created_at_val = user.created_at
                # Handle polymorphic created_at (datetime vs str)
                if hasattr(created_at_val, "isoformat"):
                    created_at_str = created_at_val.isoformat()
                else:
                    created_at_str = str(created_at_val) if created_at_val else None

                users.append({
                    "user_id": user.id,
                    "email": user.email,
                    "created_at": created_at_str
                })
            return users
        except Exception as e:
            logger.error("Failed to fetch user list", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve users."
            )

    def get_overview_stats(self) -> Dict[str, int]:
        self._verify_admin_client()
        try:
            # 1. Total users
            users_response = supabase_admin.auth.admin.list_users()
            total_users = len(users_response)
            
            # 2. Total history items
            history_response = supabase_admin.table("history").select("*", count="exact", head=True).execute()
            total_history_items = history_response.count if history_response.count is not None else 0
            
            # 3. Total admins
            admin_response = supabase_admin.table("user_roles")\
                .select("*", count="exact", head=True)\
                .in_("role", ["admin", "superadmin"])\
                .execute()
            total_admins = admin_response.count if admin_response.count is not None else 0
            
            return {
                "total_users": total_users,
                "total_history_items": total_history_items,
                "total_admins": total_admins
            }
        except Exception as e:
            logger.error("Failed to fetch overview stats", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to compute overview stats."
            )

admin_service = AdminService()
