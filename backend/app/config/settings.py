from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AutoCollective API"
    environment: str = "development"
    port: int = 8000
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "autocollective"
    jwt_secret: str = "autocollective_dev_secret_change_in_prod"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    mail_mode: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
