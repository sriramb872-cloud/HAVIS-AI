"""
FastAPI Server Entry Point
Usage: python run.py
"""
import uvicorn
import os
from dotenv import load_dotenv

# Ensure environment variables are loaded from .env
load_dotenv(".env")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("DEBUG", "true").lower() == "true"
    
    # Run uvicorn server in optimized development mode
    uvicorn.run(
        "app.main:app", 
        host=host, 
        port=port, 
        reload=debug, # Auto-reload on changes
        log_level="info", # Managed by structlog in app.main
        access_log=True
    )
    
    print(f"Backend environment: {'Development' if debug else 'Production'}")
