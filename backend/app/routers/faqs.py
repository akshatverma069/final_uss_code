"""
FAQ routes
Security: Public endpoint with rate limiting
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List
from app.database import get_db
from app.models import FAQ
from app.schemas import FAQResponse
from app.config import settings

router = APIRouter(prefix="/api/faqs", tags=["FAQs"])
limiter = Limiter(key_func=get_remote_address)


@router.get("", response_model=List[FAQResponse])
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_faqs(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all FAQs
    Security: Public endpoint with rate limiting
    """
    result = await db.execute(select(FAQ).order_by(FAQ.faq_id))
    faqs = result.scalars().all()
    
    return [FAQResponse.model_validate(faq) for faq in faqs]


@router.get("/{faq_id}", response_model=FAQResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_faq(
    request: Request,
    faq_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific FAQ
    Security: Public endpoint with rate limiting
    """
    result = await db.execute(select(FAQ).where(FAQ.faq_id == faq_id))
    faq = result.scalar_one_or_none()
    
    if faq is None:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    
    return FAQResponse.model_validate(faq)

