import logging
import sys
import structlog
from app.core.config import settings

def setup_logging():
    """
    Sets up structured logging for production environments and clear, 
    color-coded logging for development.
    """
    
    # Define standard processors for structlog
    processors = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.UnicodeDecoder(),
    ]

    # Adjust based on environment
    if settings.STRUCTURED_LOGS and not settings.DEBUG:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))

    # Configure standard logging to channel into structlog
    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Basic configuration for standard logging
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, settings.LOG_LEVEL.upper()),
        stream=sys.stdout,
    )

    # Silence noisy logs from libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Initialization function
# This is called during app startup (lifespan)
def get_logger(name: str):
    return structlog.get_logger(name)
