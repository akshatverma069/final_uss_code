"""
Security analysis routes
Security: Password strength analysis, compromised password detection
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List, Dict, Any
from app.database import get_db
from app.models import User, Password
from app.schemas import PasswordAnalysisResponse
from app.dependencies import get_current_user
from app.security import calculate_password_strength
from app.config import settings
from fastapi import HTTPException, status

router = APIRouter(prefix="/api/security", tags=["Security"])
limiter = Limiter(key_func=get_remote_address)

# Security: Compromised passwords list (in production, use Have I Been Pwned API)
COMPROMISED_PASSWORDS = {
    "password123", "password", "12345678", "qwerty", "abc123",
    "monkey", "1234567890", "letmein", "trustno1", "dragon",
    "baseball", "iloveyou", "master", "sunshine", "ashley",
    "bailey", "passw0rd", "shadow", "123123", "654321",
    "superman", "qazwsx", "michael", "football", "welcome"
}


@router.get("/analysis", response_model=PasswordAnalysisResponse)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def analyze_passwords(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze all passwords for security issues
    Security: Authentication required, comprehensive analysis
    """
    # Security: Get all user passwords
    result = await db.execute(
        select(Password).where(Password.user_id == current_user.user_id)
    )
    passwords = result.scalars().all()
    
    total_passwords = len(passwords)
    compromised_count = 0
    weak_count = 0
    reused_count = 0
    strong_count = 0
    
    compromised_passwords = []
    weak_passwords = []
    reused_passwords = []
    password_map = {}
    
    # Security: Analyze each password
    for pwd in passwords:
        # Security: Check if compromised
        if pwd.application_password.lower().strip() in COMPROMISED_PASSWORDS:
            compromised_count += 1
            compromised_passwords.append({
                "id": str(pwd.password_id),
                "platform": pwd.application_name,
                "username": pwd.account_user_name,
                "password": pwd.application_password,
                "breachCount": 1,
                "lastBreachDate": "2024-01-15"
            })
        
        # Security: Check strength
        strength = calculate_password_strength(pwd.application_password)
        if strength < 40:
            weak_count += 1
            weak_passwords.append({
                "id": str(pwd.password_id),
                "platform": pwd.application_name,
                "username": pwd.account_user_name,
                "password": pwd.application_password,
                "score": strength,
                "issues": get_password_issues(pwd.application_password)
            })
        elif strength >= 75:
            strong_count += 1
        
        # Security: Check for reuse
        pwd_lower = pwd.application_password.lower().strip()
        if pwd_lower not in password_map:
            password_map[pwd_lower] = []
        password_map[pwd_lower].append(pwd)
    
    # Security: Find reused passwords
    for pwd_value, pwd_list in password_map.items():
        if len(pwd_list) > 1:
            reused_count += 1
            reused_passwords.append({
                "id": str(pwd_list[0].password_id),
                "platform": pwd_list[0].application_name,
                "username": pwd_list[0].account_user_name,
                "password": pwd_list[0].application_password,
                "reuseCount": len(pwd_list),
                "usedIn": [f"{p.application_name} ({p.account_user_name})" for p in pwd_list]
            })
    
    # Security: Calculate health score
    health_score = calculate_health_score(
        total_passwords, strong_count, compromised_count, weak_count, reused_count
    )
    
    return PasswordAnalysisResponse(
        total_passwords=total_passwords,
        compromised_count=compromised_count,
        weak_count=weak_count,
        reused_count=reused_count,
        strong_count=strong_count,
        health_score=health_score,
        compromised_passwords=compromised_passwords,
        weak_passwords=weak_passwords,
        reused_passwords=reused_passwords
    )


@router.get("/stats")
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def get_security_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get security statistics
    Security: Authentication required
    """
    # Security: Get total passwords
    total_result = await db.execute(
        select(func.count(Password.password_id)).where(Password.user_id == current_user.user_id)
    )
    total_passwords = total_result.scalar() or 0
    
    # Security: Get weak passwords count
    weak_result = await db.execute(
        select(func.count(Password.password_id)).where(
            and_(
                Password.user_id == current_user.user_id,
                Password.pswd_strength <= 40
            )
        )
    )
    weak_count = weak_result.scalar() or 0
    
    # Security: Get average strength
    avg_result = await db.execute(
        select(func.avg(Password.pswd_strength)).where(Password.user_id == current_user.user_id)
    )
    avg_strength = avg_result.scalar() or 0
    
    return {
        "total_passwords": total_passwords,
        "weak_password_count": weak_count,
        "avg_strength": round(float(avg_strength), 2) if avg_strength else 0
    }


def get_password_issues(password: str) -> List[str]:
    """Get list of password issues"""
    issues = []
    
    if len(password) < 8:
        issues.append("Password is too short (minimum 8 characters)")
    if not any(c.isupper() for c in password):
        issues.append("Missing uppercase letters")
    if not any(c.islower() for c in password):
        issues.append("Missing lowercase letters")
    if not any(c.isdigit() for c in password):
        issues.append("Missing numbers")
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        issues.append("Missing special characters")
    
    return issues


def calculate_health_score(
    total: int, strong: int, compromised: int, weak: int, reused: int
) -> int:
    """Calculate security health score (0-100)"""
    if total == 0:
        return 100
    
    score = (strong / total) * 100
    score -= (compromised / total) * 50  # Heavy penalty for compromised
    score -= (weak / total) * 30  # Penalty for weak
    score -= (reused / total) * 20  # Penalty for reused
    
    return max(0, min(100, int(score)))

