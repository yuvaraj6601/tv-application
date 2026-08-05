import asyncio
import logging

from src.db.connection import connect_db
from src.logging_config import configure_logging

logger = logging.getLogger(__name__)


async def run() -> None:
    configure_logging()
    await connect_db()
    # capture -> detect -> match -> session -> daily_writer loop wired via /feature build order


if __name__ == "__main__":
    asyncio.run(run())
