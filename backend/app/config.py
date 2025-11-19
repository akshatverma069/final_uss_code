"""
Configuration settings for the Password Manager Backend
Security: All sensitive data loaded from environment variables
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # Server Configuration
    APP_NAME: str = "Password Manager API"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database Configuration - Security: Credentials from environment
    DB_HOST: str = os.getenv("DB_HOST", "192.168.2.234")
    DB_USER: str = os.getenv("DB_USER", "uss-lousser")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "l4o8u5d1")
    DB_NAME: str = os.getenv("DB_NAME", "uss_database")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    
    # Security: Database connection pool settings
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    
    # JWT Configuration - Security: Secret key from environment
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-this-secret-key-in-production-use-strong-random-key")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Security: Password hashing configuration
    PASSWORD_HASH_ALGORITHM: str = "argon2"  # Options: argon2, bcrypt
    ARGON2_TIME_COST: int = 2
    ARGON2_MEMORY_COST: int = 65536  # 64 MB
    ARGON2_PARALLELISM: int = 4
    BCRYPT_ROUNDS: int = 12
    
    # Security: Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_AUTH: str = "5/minute"
    RATE_LIMIT_PASSWORD: str = "20/minute"
    RATE_LIMIT_GENERAL: str = "100/minute"
    
    # Security: CORS configuration
    # For mobile apps, allow all origins (CORS is less restrictive for mobile)
    CORS_ORIGINS: list = [
        "*",  # Allow all origins for mobile app
        "http://localhost:3000",
        "http://localhost:8081",
        "http://192.168.2.234:3000",
        "http://192.168.2.234:8000",
    ]
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: list = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    CORS_HEADERS: list = ["*"]
    
    # Security: Password requirements
    MIN_PASSWORD_LENGTH: int = 8
    RECOMMENDED_PASSWORD_LENGTH: int = 12
    REQUIRE_UPPERCASE: bool = True
    REQUIRE_LOWERCASE: bool = True
    REQUIRE_NUMBERS: bool = True
    REQUIRE_SPECIAL: bool = True
    
    # Security: Session configuration
    SESSION_TIMEOUT_MINUTES: int = 30
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    
    # Security: Encryption
    ENCRYPTION_KEY: Optional[str] = os.getenv("ENCRYPTION_KEY")
    
    # Security: Logging
    LOG_LEVEL: str = "INFO"
    LOG_SECURITY_EVENTS: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

