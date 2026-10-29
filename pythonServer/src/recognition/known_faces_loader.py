import asyncio
import json
import logging
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.config.settings import settings
from src.db.repository import get_known_faces
from src.recognition.face_matcher import KnownFace
from src.recognition.user_registry import UserRegistry

logger = logging.getLogger(__name__)


def _write_cache(faces: list[KnownFace], cache_path: Path) -> None:
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        payload = [{"visitor_id": face.visitor_id, "embedding": face.embedding} for face in faces]
        temp_path = cache_path.with_suffix(".tmp")
        temp_path.write_text(json.dumps(payload), encoding="utf-8")
        temp_path.replace(cache_path)
    except OSError as err:
        logger.warning("Could not write known-faces cache %s: %s", cache_path, err)


def _read_cache(cache_path: Path) -> list[KnownFace]:
    if not cache_path.exists():
        return []
    try:
        raw = json.loads(cache_path.read_text(encoding="utf-8"))
        return [KnownFace(visitor_id=item["visitor_id"], embedding=item["embedding"]) for item in raw]
    except (OSError, ValueError, KeyError, TypeError) as err:
        logger.warning("Ignoring unreadable known-faces cache %s: %s", cache_path, err)
        return []


async def _query_known_faces(session_factory: async_sessionmaker[AsyncSession], pi_id: str) -> list[KnownFace]:
    async with session_factory() as session:
        return await get_known_faces(session, pi_id)


async def _fetch_from_db(
    session_factory: async_sessionmaker[AsyncSession], pi_id: str, timeout_seconds: float
) -> list[KnownFace] | None:
    try:
        return await asyncio.wait_for(_query_known_faces(session_factory, pi_id), timeout_seconds)
    except Exception as err:
        logger.warning("Could not load known faces from DB: %r", err)
        return None


async def load_known_faces(
    session_factory: async_sessionmaker[AsyncSession],
    pi_id: str,
    cache_path: Path,
    timeout_seconds: float = settings.db_query_timeout_seconds,
) -> tuple[list[KnownFace], bool]:
    faces = await _fetch_from_db(session_factory, pi_id, timeout_seconds)
    if faces is not None:
        _write_cache(faces, cache_path)
        return faces, True
    return _read_cache(cache_path), False


async def refresh_known_faces(
    registry: UserRegistry,
    session_factory: async_sessionmaker[AsyncSession],
    pi_id: str,
    cache_path: Path,
    timeout_seconds: float = settings.db_query_timeout_seconds,
) -> bool:
    faces = await _fetch_from_db(session_factory, pi_id, timeout_seconds)
    if faces is None:
        return False
    registry.merge_known_faces(faces)
    _write_cache(faces, cache_path)
    return True
