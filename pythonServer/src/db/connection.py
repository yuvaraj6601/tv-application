import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config.settings import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.pi_analytics_database_url)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def check_db_connection(session_factory: async_sessionmaker[AsyncSession] = SessionLocal) -> bool:
    try:
        async with session_factory() as session:
            await session.connection()
    except Exception as err:
        logger.warning("Database unreachable: %s", err)
        return False
    logger.info("Database connected")
    return True
