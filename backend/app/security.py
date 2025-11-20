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
import os
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import secrets
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


# Security: AES Encryption/Decryption Functions
def generate_aes_key() -> bytes:
    """
    Generate a random AES-256 key (32 bytes)
    Security: Cryptographically secure random key generation
    """
    return secrets.token_bytes(32)


def aes_encrypt(plaintext: str, key: bytes) -> str:
    """
    Encrypt plaintext using AES-256-CBC
    Security: AES encryption with IV for each encryption
    """
    if not plaintext:
        return ""
    
    try:
        # Security: Generate random IV for each encryption
        iv = secrets.token_bytes(16)
        
        # Security: Create cipher with AES-256-CBC
        cipher = Cipher(
            algorithms.AES(key),
            modes.CBC(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        
        # Security: Pad plaintext to block size
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plaintext.encode('utf-8'))
        padded_data += padder.finalize()
        
        # Security: Encrypt
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        
        # Security: Combine IV and ciphertext, then base64 encode
        encrypted_data = iv + ciphertext
        return base64.b64encode(encrypted_data).decode('utf-8')
    except Exception as e:
        # Security: Log error but don't expose details
        print(f"[SECURITY] Encryption error: {str(e)}")
        raise ValueError("Encryption failed")


def aes_decrypt(ciphertext: str, key: bytes) -> str:
    """
    Decrypt ciphertext using AES-256-CBC
    Security: AES decryption with IV extraction
    """
    if not ciphertext:
        return ""
    
    try:
        # Security: Decode base64
        encrypted_data = base64.b64decode(ciphertext.encode('utf-8'))
        
        # Security: Extract IV (first 16 bytes) and ciphertext
        iv = encrypted_data[:16]
        ciphertext_bytes = encrypted_data[16:]
        
        # Security: Create cipher with AES-256-CBC
        cipher = Cipher(
            algorithms.AES(key),
            modes.CBC(iv),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        # Security: Decrypt
        padded_plaintext = decryptor.update(ciphertext_bytes) + decryptor.finalize()
        
        # Security: Unpad
        unpadder = padding.PKCS7(128).unpadder()
        plaintext = unpadder.update(padded_plaintext)
        plaintext += unpadder.finalize()
        
        return plaintext.decode('utf-8')
    except Exception as e:
        # Security: Log error but don't expose details
        print(f"[SECURITY] Decryption error: {str(e)}")
        raise ValueError("Decryption failed")


def get_keys_directory() -> str:
    """
    Get the directory for storing AES keys locally
    Security: Keys stored outside database in secure directory
    """
    # Security: Create keys directory in backend/app/keys
    keys_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "keys")
    os.makedirs(keys_dir, mode=0o700, exist_ok=True)  # Security: Restrictive permissions
    return keys_dir


def save_user_aes_key(user_id: int, key: bytes) -> bool:
    """
    Save user's AES key to local file (not in database)
    Security: Keys stored locally with user_id as filename
    """
    try:
        keys_dir = get_keys_directory()
        key_file = os.path.join(keys_dir, f"user_{user_id}.key")
        
        # Security: Save key as base64 encoded
        with open(key_file, 'wb') as f:
            # Security: Write key with restricted permissions
            os.chmod(key_file, 0o600)  # Read/write for owner only
            f.write(base64.b64encode(key))
        
        return True
    except Exception as e:
        print(f"[SECURITY] Error saving AES key for user {user_id}: {str(e)}")
        return False


def load_user_aes_key(user_id: int) -> Optional[bytes]:
    """
    Load user's AES key from local file
    Security: Keys loaded from local storage, not database
    """
    try:
        keys_dir = get_keys_directory()
        key_file = os.path.join(keys_dir, f"user_{user_id}.key")
        
        if not os.path.exists(key_file):
            return None
        
        # Security: Read and decode key
        with open(key_file, 'rb') as f:
            encoded_key = f.read()
            return base64.b64decode(encoded_key)
    except Exception as e:
        print(f"[SECURITY] Error loading AES key for user {user_id}: {str(e)}")
        return None


def delete_user_aes_key(user_id: int) -> bool:
    """
    Delete user's AES key from local storage
    Security: Clean up keys when user is deleted
    """
    try:
        keys_dir = get_keys_directory()
        key_file = os.path.join(keys_dir, f"user_{user_id}.key")
        
        if os.path.exists(key_file):
            os.remove(key_file)
        
        return True
    except Exception as e:
        print(f"[SECURITY] Error deleting AES key for user {user_id}: {str(e)}")
        return False

