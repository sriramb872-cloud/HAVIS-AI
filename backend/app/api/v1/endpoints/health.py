from fastapi import APIRouter, status
import structlog
from app.core.config import settings
from supabase import create_client

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/liveness")
@router.get("/health")
async def health_check():
    """
    Standard liveness check for k8s/monitoring services (uptime).
    """
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    }


@router.get("/readiness")
async def readiness_check():
    """
    Deep readiness probe — verifies Supabase connectivity.
    SQLAlchemy / SQLite are no longer used in this project.
    """
    health_status = {
        "supabase": "unhealthy",
        "service": "online"
    }

    try:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL or SUPABASE_KEY not configured")

        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        # Lightweight check: fetch 0 rows from history table
        client.table("history").select("id").limit(1).execute()
        health_status["supabase"] = "healthy"
        logger.info("Readiness check: Supabase connectivity confirmed")
    except Exception as e:
        logger.error("Readiness check: Supabase connectivity failed", error=str(e))

    if all(v in ("healthy", "online") for v in health_status.values()):
        return health_status
    return health_status, status.HTTP_503_SERVICE_UNAVAILABLE
