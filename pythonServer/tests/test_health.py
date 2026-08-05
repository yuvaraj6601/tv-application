import os

os.environ.setdefault("PI_ANALYTICS_DATABASE_URL", "mysql+aiomysql://user:password@localhost:3306/pythonServer_test")

from src.config.settings import Settings
from src.db.models import Base, Session, SyncLog, Visitor


def test_settings_load_from_env() -> None:
    settings = Settings()
    assert settings.pi_id == "local-dev-test"
    assert settings.environment == "local"


def test_models_registered_on_base() -> None:
    table_names = set(Base.metadata.tables.keys())
    assert {"visitors", "sessions", "sync_log"}.issubset(table_names)
    assert Visitor.__tablename__ == "visitors"
    assert Session.__tablename__ == "sessions"
    assert SyncLog.__tablename__ == "sync_log"
