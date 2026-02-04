from typing import List
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl

class Settings(BaseSettings):
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Malta HR Fortress"
    
    # Database
    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "malta_hr_db"
    
    # Security
    MASTER_SEED: str = "change_this_to_a_secure_random_string_in_production"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
