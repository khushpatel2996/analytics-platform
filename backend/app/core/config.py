import os
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Base directory for the backend (assumes this file is at backend/app/core/config.py)
CURRENT_FILE = Path(__file__).resolve()
APP_DIR = CURRENT_FILE.parent.parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "India Sales Analytics & Business Intelligence Dashboard"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

    BASE_DIR: Path = BACKEND_DIR
    WORKSPACE_DIR: Path = PROJECT_ROOT

    # Paths - prioritize environment variables, then fallback to backend/data or root data
    DATA_RAW_DIR: Path = Field(default_factory=lambda: Path(os.getenv("DATA_PATH", str(BACKEND_DIR / "data" / "raw"))))
    DATA_PROCESSED_DIR: Path = Field(default_factory=lambda: Path(os.getenv("PROCESSED_DATA_PATH", str(BACKEND_DIR / "data" / "processed"))))
    MODELS_DIR: Path = Field(default_factory=lambda: Path(os.getenv("MODELS_DIR", str(BACKEND_DIR / "models"))))

    # Database
    DATABASE_URL: str = Field(default_factory=lambda: os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BACKEND_DIR / 'data' / 'processed' / 'sales_analytics.db'}"
    ))

    # CORS
    ALLOWED_ORIGINS: List[str] = Field(default_factory=lambda: [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS", 
            "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,*"
        ).split(",")
        if origin.strip()
    ])

    # Upload & Profiling Configuration
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    ALLOWED_UPLOAD_EXTENSIONS: List[str] = Field(default_factory=lambda: [".csv", ".xlsx", ".xls", ".json"])

    def ensure_directories(self):
        """Ensure all required data and model directories exist."""
        self.DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)
        self.DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        self.MODELS_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
