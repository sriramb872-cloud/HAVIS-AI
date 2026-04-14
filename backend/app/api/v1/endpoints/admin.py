from fastapi import APIRouter, Depends
from app.api.deps import CurrentUser, get_admin_user
from app.services.admin_service import admin_service
from app.services.analytics_service import analytics_service
from app.services.analytics_read_service import analytics_read_service
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.get("/check")
def check_admin_status(current_user: CurrentUser = Depends(get_admin_user)):
    """
    Minimal read-only route strictly for verifying admin/superadmin access level.
    """
    logger.info("Admin access verified", user_id=current_user.id, role=current_user.role)
    
    analytics_service.track_event(
        user_id=current_user.id,
        event_type="admin_auth_verified",
        module="admin",
        metadata={"role": current_user.role}
    )

    return {
        "status": "success",
        "user_id": current_user.id,
        "role": current_user.role,
        "message": "Admin authorization granted"
    }

@router.get("/users")
def get_all_users(current_user: CurrentUser = Depends(get_admin_user)):
    """
    Returns a minimal list of users for administration.
    """
    logger.info("Admin fetched user list", admin_id=current_user.id)
    users = admin_service.list_users()

    analytics_service.track_event(
        user_id=current_user.id,
        event_type="admin_users_viewed",
        module="admin",
        metadata={"user_count": len(users)}
    )

    return {"status": "success", "users": users}

@router.get("/overview")
def get_admin_overview(current_user: CurrentUser = Depends(get_admin_user)):
    """
    Returns minimal overview counts for the admin dashboard.
    """
    logger.info("Admin fetched overview stats", admin_id=current_user.id)
    stats = admin_service.get_overview_stats()

    analytics_service.track_event(
        user_id=current_user.id,
        event_type="admin_overview_viewed",
        module="admin",
        metadata=stats
    )

    return {"status": "success", "data": stats}

# --- ANALYTICS INSIGHTS (READ-ONLY) ---

@router.get("/analytics/summary")
def get_analytics_summary(current_user: CurrentUser = Depends(get_admin_user)):
    """
    Returns aggregated telemetry counts for Dashboard tiles.
    """
    summary = analytics_read_service.get_summary()
    return {"status": "success", "summary": summary}

@router.get("/analytics/by-module")
def get_analytics_by_module(current_user: CurrentUser = Depends(get_admin_user)):
    """
    Returns event counts grouped by module.
    """
    data = analytics_read_service.get_by_module()
    return {"status": "success", "data": data}

@router.get("/analytics/by-event")
def get_analytics_by_event(current_user: CurrentUser = Depends(get_admin_user)):
    """
    Returns event counts grouped by type.
    """
    data = analytics_read_service.get_by_event()
    return {"status": "success", "data": data}

@router.get("/analytics/recent")
def get_recent_analytics(current_user: CurrentUser = Depends(get_admin_user)):
    """
    Returns the most recent activity feed.
    """
    activity = analytics_read_service.get_recent_activity(limit=25)
    return {"status": "success", "activity": activity}
