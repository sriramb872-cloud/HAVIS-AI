import os
import uuid
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException

class StorageService:
    def __init__(self, upload_dir: str = "uploads/videos"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.allowed_extensions = {".mp4", ".mov", ".avi", ".webm"}

    async def save_video(self, file: UploadFile) -> str:
        """
        Saves an uploaded video file with a secure UUID filename.
        Validates extension and prevents path traversal.
        """
        # Validate extension
        ext = Path(file.filename).suffix.lower()
        if ext not in self.allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported video format. Allowed: {', '.join(self.allowed_extensions)}"
            )

        # Generate secure UUID filename
        unique_filename = f"{uuid.uuid4()}{ext}"
        target_path = self.upload_dir / unique_filename

        # Save file iteratively to prevent memory issues
        try:
            total_bytes = 0
            with target_path.open("wb") as buffer:
                while chunk := await file.read(1024 * 1024):  # 1MB chunks
                    buffer.write(chunk)
                    total_bytes += len(chunk)
            
            # Validation: Prevent 0-byte files which cause 416 Range errors
            if total_bytes == 0:
                if target_path.exists():
                    os.remove(target_path)
                raise HTTPException(status_code=400, detail="Empty video file received. Recording may have failed in-browser.")
                
        except HTTPException:
            raise
        except Exception as e:
            if target_path.exists():
                os.remove(target_path)
            raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

        # Return the path relative to the uploads directory for serving
        return f"videos/{unique_filename}"

storage_service = StorageService()
