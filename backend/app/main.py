from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
from app.core.config import settings
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import time
from app.core.rate_limit import limiter
from app.core.logging import setup_logging
from app.api.v1.endpoints import ai, history
from fastapi.staticfiles import StaticFiles
import os
import mimetypes

# Ensure media types are registered to avoid ERR_BLOCKED_BY_ORB
mimetypes.add_type("video/webm", ".webm")
mimetypes.add_type("video/mp4", ".mp4")

# Initialize structured logging globally
setup_logging()
logger = structlog.get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Standard lifecycle management for startup/shutdown tasks.
    """
    logger.info("Service starting up", project=settings.PROJECT_NAME)
    # Validate required Supabase configuration at startup
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.critical(
            "FATAL: SUPABASE_URL and SUPABASE_KEY must be set in .env. "
            "Backend will not function correctly without Supabase credentials. "
            "No SQLite fallback exists."
        )
    else:
        logger.info("Supabase configuration verified", supabase_url=settings.SUPABASE_URL[:30] + "...")
    yield
    logger.info("Service shutting down")

# FastAPI App Instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Scalable, production-grade backend for AI-driven cognitive tools.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Standard Middlewares - Phase 8: Production CORS Fix
origins = [
    "http://localhost:5173",
    "https://havis-ai.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure video upload directory exists for session recordings
os.makedirs("uploads/videos", exist_ok=True)

# Rate limiting now handled via SupabaseRateLimiter in app.core.rate_limit

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """
    Phase 7 Upgrade: Supabase-Backed Proxy-Safe Rate Limiting.
    Defaults to 15 requests/min.
    """
    # Phase 3: Proxy-Safe Identification
    client_id = limiter.get_client_ip(request)
    
    # Filter only AI/Heavy endpoints for strict limiting
    if "/api/v1/ai/" in request.url.path:
        # Phase 2: Supabase Check with Fallback
        is_limited = await limiter.is_rate_limited(client_id, route="ai_endpoints")
        
        if is_limited:
            return JSONResponse(
                status_code=429,
                content={"error": "Too many requests. Please slow down."}
            )

    response = await call_next(request)
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Phase 5: API Validation Protection"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Invalid input format. Please check required fields."}
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Phase 2: Global Error Catch-All"""
    # Don't log sensitive business data, but log core failure
    import structlog
    logger = structlog.get_logger(__name__)
    logger.exception("Global exception caught", path=request.url.path)
    
    return JSONResponse(
        status_code=500,
        content={"error": "An internal system error occurred. Our engineers are notified."}
    )

class MediaStaticFiles(StaticFiles):
    """
    Custom StaticFiles handler to add necessary CORS/CORP headers 
    for cross-origin media playback.
    """
    async def get_response(self, path: str, scope):
        try:
            response = await super().get_response(path, scope)
            # Prevents Opaque Response Blocking (ORB) on modern browsers
            response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
            
            # Explicit CORS for static assets as middleware might skip sub-mounted apps
            origin = scope.get("headers", {}).get(b"origin", b"").decode("utf-8")
            allowed_origins = [str(o).rstrip("/") for o in settings.BACKEND_CORS_ORIGINS]
            
            if origin in allowed_origins:
                response.headers["Access-Control-Allow-Origin"] = origin
            else:
                # Fallback to first allowed or * is risky for credentials, 
                # but for media streaming GETs it is often okay.
                response.headers["Access-Control-Allow-Origin"] = allowed_origins[0] if allowed_origins else "*"

            response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS, HEAD"
            response.headers["Access-Control-Allow-Headers"] = "*"
            return response
        except Exception:
            raise

app.mount(f"{settings.API_V1_STR}/media", MediaStaticFiles(directory="uploads"), name="media")

from app.api.v1.endpoints import ai, history, admin

app.include_router(
    history.router,
    prefix=f"{settings.API_V1_STR}/history",
    tags=["History Logging"],
)

app.include_router(
    ai.router, 
    prefix=f"{settings.API_V1_STR}/ai", 
    tags=["AI Core"]
)

app.include_router(
    admin.router,
    prefix=f"{settings.API_V1_STR}/admin",
    tags=["Admin Analytics"]
)

if __name__ == "__main__":
    import uvicorn
    # In development mode, reload is enabled
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=settings.DEBUG,
        log_level="info"
    )
