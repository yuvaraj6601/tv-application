from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    environment: str = "local"
    pi_analytics_database_url: str
    pi_id: str = "local-dev-test"

    capture_interval_seconds: int = 2
    absence_timeout_seconds: int = 30
    face_match_distance_threshold: float = 0.2

    camera_frame_width: int = 1280
    camera_frame_height: int = 720

    data_dir: str = "data"
    rotation_check_interval_seconds: int = 3600
    sync_interval_seconds: int = 300

    # Testing-only debug camera stream (test/camera-debug-stream branch). Never enable in production.
    debug_stream_enabled: bool = False
    debug_stream_host: str = "0.0.0.0"
    debug_stream_port: int = 8765


settings = Settings()
