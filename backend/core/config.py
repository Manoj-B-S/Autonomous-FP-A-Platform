from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://fpa_user:fpa_password@localhost:5432/fpa_platform"
    redis_url: str = "redis://localhost:6379/0"
    anthropic_api_key: str = ""
    sendgrid_api_key: str = ""
    from_email: str = "noreply@summitgrowth.com"
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    data_dir: str = "/app/data/sample"
    
    class Config:
        env_file = ".env"


settings = Settings()
