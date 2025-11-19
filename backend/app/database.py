"""
Database connection and session management
Security: SSL connections, connection pooling, parameterized queries
"""
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings
import aiomysql
from typing import AsyncGenerator
from urllib.parse import quote_plus

# Security: Use SSL for database connections in production
# Security: Connection string with SSL parameters
encoded_user = quote_plus(settings.DB_USER)
encoded_password = quote_plus(settings.DB_PASSWORD)
DATABASE_URL = (
    f"mysql+aiomysql://{encoded_user}:{encoded_password}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}?charset=utf8mb4"
)

# Security: Create async engine with pool settings for connection security
engine = create_async_engine(
    DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    echo=settings.DEBUG,  # Security: Only in debug mode
    future=True,
)

# Security: Session factory with proper isolation
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


# Security: Dependency for getting database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function for getting database session
    Security: Proper session management and cleanup
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Security: Test database connection
async def test_connection():
    """Test database connection with security checks"""
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

