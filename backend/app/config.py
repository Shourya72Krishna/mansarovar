from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_name:        str = "मानसरोवर"
    app_tagline:     str = "Divine Knowledge Vault"
    app_logo_letter: str = "म"
    app_env:         str = "development"
    port:            int = 5000
    host:            str = "0.0.0.0"
    frontend_url:    str = ""
    backend_url:     str = ""
    database_url:    str = ""
    jwt_secret:      str = ""
    jwt_algorithm:   str = "HS256"
    jwt_expires_in:  str = "7d"
    jwt_expire_days: int = 7
    google_client_id:        str = ""
    google_client_secret:    str = ""
    google_callback_url:     str = ""
    google_drive_scope:      str = ""
    super_admin_email:       str = ""
    rate_limit_max_requests: int = 100
    session_secret:          str = ""
    log_level:               str = ""
    bcrypt_rounds:           int = 12

    @property
    def google_redirect_uri(self) -> str:
        return self.google_callback_url

    @property
    def rate_limit_per_minute(self) -> int:
        return self.rate_limit_max_requests

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