"""
User lookup routes
Security: Authenticated search with minimal data exposure
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List, Dict, Any
from app.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/users", tags=["Users"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/search", response_model=List[Dict[str, Any]])
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def search_users(
    request: Request,
    q: str = Query(..., min_length=2, max_length=50, description="Username search query"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Search users by username prefix/substring.
    Security: excludes current user, returns limited public info.
    """
    # Basic substring match; use ILIKE for case-insensitive on MySQL via LOWER
    query = select(User.user_id, User.username).where(
        User.username.like(f"%{q}%")
    ).limit(limit + 1)

    result = await db.execute(query)
    rows = result.all()

    # Filter out current user and map
    users = [
        {"user_id": user_id, "username": username}
        for (user_id, username) in rows
        if user_id != current_user.user_id
    ][:limit]

    return users


