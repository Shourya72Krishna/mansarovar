from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_name:        str = "मानसरोवर"
    app_tagline:     str = "Divine Knowledge Vault"
    app_logo_letter: str = "म"
    app_env:         str = "development"
    port:            int = 5000
    host:            str = "0.0.0.0"
    frontend_url:    str = "http://localhost:5173"
    backend_url:     str = "http://localhost:5000"
    database_url:    str = ""
    jwt_secret:      str = "dev_secret_change_in_production"
    jwt_algorithm:   str = "HS256"
    jwt_expire_days: int = 7
    google_client_id:     str = ""
    google_client_secret: str = ""
    google_redirect_uri:  str = "http://localhost:5000/api/auth/google/callback"
    google_drive_scope:   str = "https://www.googleapis.com/auth/drive.file"
    super_admin_email:    str = ""
    rate_limit_per_minute: int = 100

    def is_dev(self) -> bool:
        return self.app_env == "development"

    def is_prod(self) -> bool:
        return self.app_env == "production"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = 'ignore'

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
