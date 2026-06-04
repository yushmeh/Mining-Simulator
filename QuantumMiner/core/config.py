from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Конфигурация приложения. Значения берутся из .env или переменных окружения."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Quantum Miner"
    debug: bool = False
    secret_key: str = "super-secret-quantum-mining-key"
    session_cookie: str = "qm_session"


settings = Settings()
