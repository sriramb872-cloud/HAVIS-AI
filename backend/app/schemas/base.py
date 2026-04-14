from typing import Generic, Optional, TypeVar, Any, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

T = TypeVar("T")

class BaseSchema(BaseModel):
    """
    Standard configuration for all schemas.
    """
    model_config = ConfigDict(
        from_attributes=True,
        validate_assignment=True,
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class ResponseModel(BaseSchema, Generic[T]):
    """
    Generic API Response wrapper for consistent structure.
    """
    status: str = "success"
    message: Optional[str] = None
    data: Optional[T] = None
    error: Optional[str] = None
    timestamp: datetime = datetime.utcnow()

class ErrorResponse(BaseSchema):
    """
    Standard error format for catch-all exceptions.
    """
    status: str = "error"
    message: str
    code: Optional[str] = None
    details: Optional[Any] = None
