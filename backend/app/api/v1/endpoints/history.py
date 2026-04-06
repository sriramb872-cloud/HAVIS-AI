from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
from app.api.deps import CurrentUser as User, get_current_user
from app.schemas.history import HistoryResponse, HistoryLogRequest
from app.services.history_service import history_service
from app.services.analytics_service import analytics_service
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.get("/", response_model=List[HistoryResponse])
def get_user_history(
    feature_name: Optional[str] = None,
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    try:
        # Fetch history for user from Supabase Service securely with token
        records = history_service.get_user_history(
            user_id=current_user.id, 
            token=current_user.token,
            feature_name=feature_name,
            date=date
        )
        
        result = []
        for r in records:
            result.append(
                HistoryResponse(
                    id=str(r.get("id")),
                    user_id=str(r.get("user_id")),
                    feature_name=r.get("feature_name"),
                    input_data=r.get("input_data"),
                    output_data=r.get("output_data"),
                    metadata_blob=r.get("metadata"),
                    created_at=r.get("created_at")
                )
            )
        
        analytics_service.track_event(
            user_id=current_user.id,
            event_type="history_viewed",
            module="history",
            metadata={"record_count": len(result), "feature_filter": feature_name}
        )

        return result
    except Exception as e:
        logger.error("Failed to retrieve history", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve history")
        
@router.post("/log")
def log_custom_history(
    request: HistoryLogRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        record = history_service.save_history(
            user_id=current_user.id,
            token=current_user.token,
            feature_name=request.feature_name,
            input_data=request.input_data,
            output_data=request.output_data,
            metadata=request.metadata_blob
        )
        if record:
            return {"status": "success", "id": record.get("id")}
        return {"status": "success", "message": "Logged without ID"}
    except Exception as e:
        logger.error("Failed to manual log history", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to manual log history")

@router.delete("/{history_id}")
def delete_history_item(
    history_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        logger.info(
            "DELETE history request received",
            history_id=history_id,
            user_id=current_user.id
        )
        deleted = history_service.delete_history(
            history_id=history_id,
            user_id=current_user.id,
            token=current_user.token
        )
        if not deleted:
            logger.warning(
                "Delete attempted on non-existent or unauthorized record",
                history_id=history_id,
                user_id=current_user.id
            )
            raise HTTPException(status_code=404, detail="History record not found or unauthorized")
        logger.info("History record deleted", history_id=history_id, user_id=current_user.id)
        
        analytics_service.track_event(
            user_id=current_user.id,
            event_type="history_deleted",
            module="history",
            metadata={"history_id": history_id}
        )

        return {"status": "success", "message": "History deleted successfully"}
    except HTTPException:
        raise  # Always surface 404/401 correctly — do NOT wrap in 500
    except Exception as e:
        logger.error("Failed to delete history item", error=str(e), history_id=history_id, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete history item")
