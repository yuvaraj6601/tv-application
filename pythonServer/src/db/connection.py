import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config.settings import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(
    settings.pi_analytics_database_url, connect_args={"connect_timeout": settings.db_connect_timeout_seconds}
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def _probe(session_factory: async_sessionmaker[AsyncSession]) -> None:
    async with session_factory() as session:
        await session.connection()


async def check_db_connection(
    session_factory: async_sessionmaker[AsyncSession] = SessionLocal,
    timeout_seconds: float = settings.db_connect_timeout_seconds,
) -> bool:
    try:
        await asyncio.wait_for(_probe(session_factory), timeout_seconds)
    except Exception as err:
        logger.warning("Database unreachable: %r", err)
        return False
    logger.info("Database connected")
    return True
