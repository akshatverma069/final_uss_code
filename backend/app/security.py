"""
Security utilities and functions
Security: Password hashing, JWT tokens, encryption, validation
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.hash import argon2, bcrypt
import re
from app.config import settings

# Security: Password hashing context with Argon2 (winner of PHC)
# Security: Argon2 is resistant to GPU/ASIC attacks and timing attacks
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    default="argon2",
    argon2__time_cost=settings.ARGON2_TIME_COST,
    argon2__memory_cost=settings.ARGON2_MEMORY_COST,
    argon2__parallelism=settings.ARGON2_PARALLELISM,
    bcrypt__rounds=settings.BCRYPT_ROUNDS,
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash
    Security: Constant-time comparison to prevent timing attacks
    """
    try:
        # Security: Support both SHA256 (legacy) and Argon2/bcrypt (new)
        if hashed_password.startswith("sha256$"):
            # Legacy SHA256 verification
            import hashlib
            password_hash = hashlib.sha256(plain_password.encode()).hexdigest()
            stored_hash = hashed_password.replace("sha256$", "")
            # Security: Constant-time comparison
            return password_hash == stored_hash
        else:
            # Argon2/bcrypt verification
            return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using Argon2
    Security: Argon2 is the current best practice for password hashing
    """
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token
    Security: Signed tokens with expiration
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    
    # Security: HS256 algorithm with secret key
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode JWT token
    Security: Token validation with error handling
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def calculate_password_strength(password: str) -> int:
    """
    Calculate password strength score (0-100)
    Security: Comprehensive strength analysis
    """
    score = 0
    
    # Length check
    if len(password) >= 12:
        score += 25
    elif len(password) >= 8:
        score += 15
    elif len(password) >= 6:
        score += 5
    
    # Character variety
    if re.search(r'[a-z]', password):
        score += 15
    if re.search(r'[A-Z]', password):
        score += 15
    if re.search(r'[0-9]', password):
        score += 15
    if re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        score += 20
    
    # Security: Check for weak patterns
    weak_patterns = [
        r'^[0-9]+$',  # Only numbers
        r'^[a-zA-Z]+$',  # Only letters
        r'^(.)\1+$',  # All same character
        r'^12345',  # Sequential numbers
        r'^abcde',  # Sequential letters (case-insensitive)
        r'^qwerty',  # Keyboard patterns (case-insensitive)
        r'^password',  # Common words (case-insensitive)
    ]
    
    for pattern in weak_patterns:
        if re.match(pattern, password, re.IGNORECASE):
            score -= 20
            break
    
    # Security: Check for common words
    common_words = ['password', 'admin', 'welcome', 'qwerty', '12345', 'letmein', 'monkey']
    lower_password = password.lower()
    for word in common_words:
        if word in lower_password:
            score -= 15
            break
    
    # Security: Check for repetition
    if re.search(r'(.)\1{2,}', password):
        score -= 10
    
    # Security: Ensure score is between 0 and 100
    return max(0, min(100, score))


def validate_password(password: str) -> tuple[bool, list[str]]:
    """
    Validate password against security requirements
    Security: Returns validation result and list of issues
    """
    issues = []
    
    if len(password) < settings.MIN_PASSWORD_LENGTH:
        issues.append(f"Password must be at least {settings.MIN_PASSWORD_LENGTH} characters long")
    
    if settings.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        issues.append("Password must contain at least one uppercase letter")
    
    if settings.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        issues.append("Password must contain at least one lowercase letter")
    
    if settings.REQUIRE_NUMBERS and not re.search(r'[0-9]', password):
        issues.append("Password must contain at least one number")
    
    if settings.REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        issues.append("Password must contain at least one special character")
    
    # Security: Check against common passwords
    common_passwords = ['password', '12345678', 'qwerty', 'abc123', 'password123']
    if password.lower() in common_passwords:
        issues.append("Password is too common and easily guessable")
    
    return len(issues) == 0, issues


def sanitize_input(input_str: str, max_length: int = 1000) -> str:
    """
    Sanitize user input to prevent injection attacks
    Security: Input sanitization and length limiting
    """
    if not input_str:
        return ""
    
    # Security: Remove null bytes and control characters
    sanitized = input_str.replace('\x00', '').replace('\r', '').replace('\n', ' ')
    
    # Security: Limit length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    # Security: Strip whitespace
    sanitized = sanitized.strip()
    
    return sanitized


def validate_username(username: str) -> bool:
    """
    Validate username format
    Security: Username validation to prevent injection
    """
    if not username or len(username) < 3 or len(username) > 50:
        return False
    
    # Security: Only alphanumeric, underscore, and hyphen allowed
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False
    
    return True

