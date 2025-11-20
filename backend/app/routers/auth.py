"""
Authentication routes
Security: Login, signup, password reset with security measures
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_db
from app.models import User, Question
from app.schemas import (
    LoginRequest, SignupRequest, TokenResponse, SecurityQuestionResponse,
    ResetPasswordRequest, ForgotPasswordRequest
)
from app.security import (
    verify_password, get_password_hash, create_access_token,
    validate_password, validate_username, calculate_password_strength,
    generate_aes_key, save_user_aes_key, load_user_aes_key,
    aes_encrypt, aes_decrypt
)
from app.dependencies import security
from app.config import settings
from datetime import timedelta
import json

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    User login endpoint
    Security: Rate limiting, password verification, token generation
    """
    # Security: Input validation
    if not validate_username(login_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid username format"
        )
    
    # Security: Query user from database (select only needed fields to avoid issues with missing columns)
    result = await db.execute(
        select(
            User.user_id,
            User.username,
            User.pswd
        ).where(User.username == login_data.username)
    )
    user_row = result.first()
    
    if user_row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    user_id, username, hashed_password = user_row
    
    # Security: Verify password
    if not verify_password(login_data.password, hashed_password):
        # Security: Log failed login attempt
        print(f"[SECURITY] Failed login attempt for username: {login_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Security: Create access token
    access_token = create_access_token(
        data={"user_id": user_id, "username": username},
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user_id,
        username=username
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def signup(
    request: Request,
    signup_data: SignupRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    User signup endpoint
    Security: Password validation, username validation, password hashing
    """
    # Security: Validate username
    if not validate_username(signup_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid username format"
        )
    
    # Security: Validate password
    is_valid, issues = validate_password(signup_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password validation failed: {', '.join(issues)}"
        )
    
    # Security: Check if username already exists
    # Handle missing encryption_salt column gracefully
    try:
        result = await db.execute(
            select(User.user_id).where(User.username == signup_data.username)
        )
        existing_user = result.scalar_one_or_none()
    except Exception as e:
        # If encryption_salt column doesn't exist, try with explicit columns
        error_str = str(e).lower()
        if "encryption_salt" in error_str or "1054" in error_str:
            result = await db.execute(
                select(User.user_id).where(User.username == signup_data.username)
            )
            existing_user = result.scalar_one_or_none()
        else:
            raise
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists"
        )
    
    # Security: Verify security question exists
    result = await db.execute(
        select(Question).where(Question.question_id == signup_data.question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Security question not found"
        )
    
    # Security: Hash password with Argon2
    hashed_password = get_password_hash(signup_data.password)
    
    # Security: Generate unique AES key for this user
    aes_key = generate_aes_key()
    
    # Security: Encrypt security question answer with user's AES key
    encrypted_answer = aes_encrypt(signup_data.answer, aes_key)
    
    # Security: Create user with hashed password and encrypted answer
    new_user = User(
        username=signup_data.username,
        pswd=hashed_password,
        question_id=signup_data.question_id,
        answers=json.dumps([encrypted_answer]),  # Store encrypted answer
        grp=json.dumps([])
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Security: Save AES key locally (not in database)
    if not save_user_aes_key(new_user.user_id, aes_key):
        # Security: If key save fails, rollback user creation
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize user encryption. Please try again."
        )
    
    # Security: Create access token
    access_token = create_access_token(
        data={"user_id": new_user.user_id, "username": new_user.username},
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=new_user.user_id,
        username=new_user.username
    )


@router.get("/questions", response_model=list[SecurityQuestionResponse])
async def get_security_questions(db: AsyncSession = Depends(get_db)):
    """
    Get all security questions
    Security: No authentication required, public endpoint
    """
    result = await db.execute(select(Question).order_by(Question.question_id))
    questions = result.scalars().all()
    
    return [SecurityQuestionResponse(question_id=q.question_id, question_text=q.question_text) for q in questions]


@router.post("/forgot-password")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def forgot_password(
    request: Request,
    forgot_data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Forgot password endpoint
    Security: Rate limiting, security question verification
    """
    # Security: Query user
    # Handle missing encryption_salt column gracefully during migration
    try:
        result = await db.execute(
            select(User).where(
                User.username == forgot_data.username,
                User.question_id == forgot_data.question_id
            )
        )
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
                ).where(
                    User.username == forgot_data.username,
                    User.question_id == forgot_data.question_id
                )
            )
            user_row = result.first()
            if user_row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found or question mismatch"
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
    
    # Security: Generic error to prevent user enumeration
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or question mismatch"
        )
    
    # Security: Load user's AES key and decrypt answers
    aes_key = load_user_aes_key(user.user_id)
    if not aes_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not found. Please contact support."
        )
    
    # Security: Decrypt and verify answer
    try:
        answers_json = json.loads(user.answers or "[]")
        decrypted_answers = [aes_decrypt(encrypted_ans, aes_key) for encrypted_ans in answers_json]
    except (json.JSONDecodeError, TypeError, ValueError):
        # Security: Handle legacy unencrypted answers
        try:
            answers_json = json.loads(user.answers or "[]")
            decrypted_answers = answers_json
        except:
            decrypted_answers = [user.answers] if user.answers else []
    
    if forgot_data.answer not in decrypted_answers:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect answer"
        )
    
    return {"success": True, "user_id": user.user_id}


@router.post("/reset-password")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def reset_password(
    request: Request,
    reset_data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset password endpoint
    Security: Password validation, verification, secure hashing
    """
    # Security: Validate new password
    is_valid, issues = validate_password(reset_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password validation failed: {', '.join(issues)}"
        )
    
    # Security: Query user
    # Handle missing encryption_salt column gracefully during migration
    try:
        result = await db.execute(
            select(User).where(User.user_id == reset_data.user_id)
        )
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
                ).where(User.user_id == reset_data.user_id)
            )
            user_row = result.first()
            if user_row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Security: Verify current password or security answer
    verified = False
    
    if reset_data.current_password:
        verified = verify_password(reset_data.current_password, user.pswd)
    elif reset_data.question_id and reset_data.answer:
        if user.question_id == reset_data.question_id:
            # Security: Load user's AES key and decrypt answers
            aes_key = load_user_aes_key(user.user_id)
            if aes_key:
                try:
                    answers_json = json.loads(user.answers or "[]")
                    decrypted_answers = [aes_decrypt(encrypted_ans, aes_key) for encrypted_ans in answers_json]
                except (json.JSONDecodeError, TypeError, ValueError):
                    # Security: Handle legacy unencrypted answers
                    try:
                        answers_json = json.loads(user.answers or "[]")
                        decrypted_answers = answers_json
                    except:
                        decrypted_answers = [user.answers] if user.answers else []
                verified = reset_data.answer in decrypted_answers
            else:
                # Security: Fallback for users without AES key (legacy)
                try:
                    answers = json.loads(user.answers or "[]")
                except (json.JSONDecodeError, TypeError):
                    answers = [user.answers] if user.answers else []
                verified = reset_data.answer in answers
    
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password or security answer is incorrect"
        )
    
    # Security: Hash new password
    hashed_password = get_password_hash(reset_data.new_password)
    
    # Security: Update password in database using UPDATE query
    # This works whether user object is attached to session or not
    from sqlalchemy import update
    await db.execute(
        update(User)
        .where(User.user_id == reset_data.user_id)
        .values(pswd=hashed_password)
    )
    await db.commit()
    
    return {"success": True, "message": "Password reset successfully"}

