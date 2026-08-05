import logging
import sys

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config.settings import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.pi_analytics_database_url)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def connect_db() -> None:
    try:
        async with engine.connect():
            logger.info("Database connected")
    except Exception as err:
        logger.error("Database connection failed: %s", err)
        sys.exit(1)
