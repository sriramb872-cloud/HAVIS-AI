from fastapi import APIRouter
from app.api.v1.endpoints import ai, health

api_v1_router = APIRouter()

# Register Core Monitoring
api_v1_router.include_router(health.router, prefix="/health", tags=["System Health"])

# Register AI-related endpoints
api_v1_router.include_router(ai.router, prefix="/ai", tags=["AI Core"])

