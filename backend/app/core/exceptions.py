from typing import Any, Dict, Optional
from fastapi import HTTPException, status

class HavisAIException(Exception):
    """
    Base exception for all application errors.
    """
    def __init__(
        self, 
        message: str, 
        code: str = "INTERNAL_ERROR", 
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Any] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)

class AIProviderError(HavisAIException):
    """
    Raised when an external AI provider (like Groq) fails.
    """
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="AI_PROVIDER_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details
        )

class ValidationException(HavisAIException):
    """
    Raised for data validation or business logic violations.
    """
    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="VALIDATION_FAILED",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

