from functools import lru_cache
from typing import Literal, Self

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    environment: Literal["development", "production"] = "production"
    database_url: SecretStr
    secret_key: SecretStr
    frontend_url: str
    allowed_hosts: list[str] = ["localhost", "127.0.0.1"]
    cookie_name: str = "hpn_session"
    cookie_secure: bool = True
    ministry_address: str | None = None

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    email_from: str = "no-reply@example.com"

    @model_validator(mode="after")
    def check(self) -> Self:
        if len(self.secret_key.get_secret_value()) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        if self.environment == "production":
            if self.secret_key.get_secret_value().startswith("change-me"):
                raise ValueError("SECRET_KEY still has its example value")
            if "allowed_hosts" not in self.model_fields_set:
                raise ValueError("ALLOWED_HOSTS is required in production")
            if "*" in self.allowed_hosts:
                raise ValueError("ALLOWED_HOSTS must not allow every host")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production")
            if not self.smtp_host:
                raise ValueError("SMTP_HOST is required in production")
        self.frontend_url = self.frontend_url.rstrip("/")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
