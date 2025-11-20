"""
Dependencies for FastAPI routes
Security: Authentication, authorization, rate limiting
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.security import verify_token
from app.models import User
from sqlalchemy import select
from typing import Optional

# Security: HTTP Bearer token authentication
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get current authenticated user
    Security: Token verification and user validation
    """
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: int = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    # Security: Verify user exists in database
    # Handle missing encryption_salt column gracefully during migration
    try:
        result = await db.execute(select(User).where(User.user_id == user_id))
        user = result.scalar_one_or_none()
    except Exception as e:
        # If encryption_salt column doesn't exist, select without it
        error_str = str(e).lower()
        if "encryption_salt" in error_str or "1054" in error_str:
            result = await db.execute(
                select(
                    User.user_id,
                    User.username,
                    User.pswd,
                    User.grp,
                    User.question_id,
                    User.answers
                ).where(User.user_id == user_id)
            )
            user_row = result.first()
            if user_row is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                )
            # Create User object without encryption_salt
            user = User(
                user_id=user_row.user_id,
                username=user_row.username,
                pswd=user_row.pswd,
                grp=user_row.grp,
                question_id=user_row.question_id,
                answers=user_row.answers,
                encryption_salt=None
            )
        else:
            raise
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise
    Security: Optional authentication for public endpoints
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None

