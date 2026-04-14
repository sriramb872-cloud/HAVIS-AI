from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime

class HistoryLogRequest(BaseModel):
    feature_name: str
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    metadata_blob: Optional[Dict[str, Any]] = None

class HistoryBase(BaseModel):
    feature_name: str
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    metadata_blob: Optional[Dict[str, Any]] = None

class HistoryResponse(HistoryBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class DateGroupedHistoryResponse(BaseModel):
    date: str
    records: List[HistoryResponse]
