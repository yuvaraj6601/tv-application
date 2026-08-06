from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    environment: str = "local"
    pi_analytics_database_url: str
    pi_id: str = "local-dev-test"

    capture_interval_seconds: int = 2
    absence_timeout_seconds: int = 30
    face_match_distance_threshold: float = 0.6

    data_dir: str = "data"
    rotation_check_interval_seconds: int = 3600
    sync_interval_seconds: int = 300


settings = Settings()
