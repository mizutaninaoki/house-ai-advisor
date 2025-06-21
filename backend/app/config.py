from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # メール設定
    resend_api_key: Optional[str] = os.getenv("RESEND_API_KEY")
    email_backend: str = os.getenv("EMAIL_BACKEND") or "smtp"
    from_email: Optional[str] = os.getenv("FROM_EMAIL")
    from_name: Optional[str] = os.getenv("FROM_NAME")
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = False

    # フロントエンド設定
    frontend_url: str = os.getenv("FRONTEND_URL") or "http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # 定義されていない環境変数を無視

settings = Settings()
