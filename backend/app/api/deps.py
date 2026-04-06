from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional
import structlog
from app.core.config import settings

logger = structlog.get_logger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Initialize standard Supabase Auth Client
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)

# Initialize Supabase Admin Client (Service Role)
supabase_admin: Optional[Client] = None
if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )

class CurrentUser(BaseModel):
    id: str
    email: str
    token: str
    role: str = "user"

def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    """
    Validates standard JWT token payloads directly using official Supabase verification hooks
    rejecting spoofing attempts dynamically accurately seamlessly mapping user_id string maps.
    """
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return CurrentUser(
            id=user_response.user.id,
            email=user_response.user.email,
            token=token
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_admin_user(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """
    Validates that the authenticated user has an administrative role.
    Queries the public.user_roles table using the service/admin supabase client.
    """
    if not supabase_admin:
        logger.error("Backend configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error. Admin verification unavailable."
        )

    try:
        response = supabase_admin.table("user_roles").select("role").eq("user_id", current_user.id).execute()
        data = response.data
        if not data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions. User role not found."
            )
            
        role = data[0].get("role")
        if role not in ["admin", "superadmin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions. Admin access required."
            )
            
        admin_user = current_user.model_copy(update={"role": role})
        return admin_user
    except HTTPException:
        # Re-raise intended 403 authorization failures
        raise
    except Exception as e:
        # Fallback for unexpected database query execution or network errors
        logger.error("Unexpected error during admin check", error=str(e), user_id=current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred while verifying permissions."
        )
