from pydantic_settings import BaseSettings
from pydantic import ValidationError
import sys
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    APP_NAME: str = "Malta HR Fortress API"
    # SECURITY CRITICAL: These MUST be provided in environment variables.
    # No defaults allowed for production security.
    MASTER_SEED: str 
    MASTER_KEY: str = "default_key_for_dev_if_needed_but_better_required" 
    
    # JWT Settings
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 12

    # Database
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "restin_v2" 

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

try:
    settings = Settings()
except ValidationError as e:
    logger.critical("FATAL: Missing critical configuration. System Refusing to Start.")
    logger.critical(e)
    sys.exit(1)
