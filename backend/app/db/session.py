"""
db/session.py — LEGACY SQLAlchemy stub (safe no-op).

This project has fully migrated to Supabase for all persistence.
SQLAlchemy / SQLite are no longer used by any active feature.

This file is kept as a stub so that any import of `engine` or `Base`
from other files does not cause an ImportError during the transition.
The `engine` and `Base` exported here are inert and do not connect to
any database.
"""
import structlog
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase

logger = structlog.get_logger(__name__)

# ── Inert in-memory engine (no file written, no SQLite on disk) ──────────────
# Using in-memory SQLite purely so Base.metadata.create_all() in main.py
# is a no-op rather than an error. Remove that call in main.py to fully
# eliminate this dependency.
engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

logger.info(
    "SQLAlchemy engine initialised as in-memory stub. "
    "All real persistence uses Supabase client. "
    "See main.py — remove Base.metadata.create_all() to complete cleanup."
)


class Base(DeclarativeBase):
    """Stub base class — no active models registered."""
    pass
