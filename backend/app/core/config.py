import os
from typing import List, Optional, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, field_validator

class Settings(BaseSettings):
    """
    Centralized configuration management with Pydantic for strict typing.
    Environment variables are automatically mapped to these fields.
    """
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        case_sensitive=True,
        extra="ignore"
    )

    # Base FastAPI settings
    PROJECT_NAME: str = "HAVIS AI Hub API"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[Union[AnyHttpUrl, str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://havis-ai.vercel.app"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Groq API Configuration
    GROQ_API_KEY: Optional[str] = None
    GROQ_DEFAULT_MODEL: str = "llama-3.1-8b-instant"
    GROQ_HIGH_CAPACITY_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_TEMPERATURE: float = 0.7
    GROQ_MAX_TOKENS: int = 2048

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"

    # Rate Limiting Configuration
    RATE_LIMIT_WND_SECONDS: int = 60
    RATE_LIMIT_MAX_REQUESTS: int = 15
    TRUSTED_PROXIES: List[str] = ["127.0.0.1", "::1"]

    # Supabase Configuration (REQUIRED — no SQLite fallback)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # Logging
    LOG_LEVEL: str = "INFO"
    STRUCTURED_LOGS: bool = True

settings = Settings()
