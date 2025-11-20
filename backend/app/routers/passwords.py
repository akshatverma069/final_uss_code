"""
Password management routes
Security: CRUD operations with authentication and authorization
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime
from typing import List
from app.database import get_db
from app.models import User, Password
from app.schemas import (
    PasswordCreate, PasswordUpdate, PasswordResponse, PasswordListResponse
)
from app.dependencies import get_current_user
from app.security import (
    calculate_password_strength, sanitize_input,
    load_user_aes_key, aes_encrypt, aes_decrypt
)
from app.config import settings

router = APIRouter(prefix="/api/passwords", tags=["Passwords"])
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=PasswordResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def create_password(
    request: Request,
    password_data: PasswordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new password
    Security: Authentication required, input sanitization, strength calculation
    """
    # Security: Sanitize inputs
    application_name = sanitize_input(password_data.application_name, 255)
    account_user_name = sanitize_input(password_data.account_user_name, 255)
    application_password = sanitize_input(password_data.application_password, 100)
    application_type = sanitize_input(password_data.application_type, 255) if password_data.application_type else None
    
    # Security: Calculate password strength before encryption
    strength = calculate_password_strength(application_password)
    
    # Security: Load user's AES key and encrypt application password
    aes_key = load_user_aes_key(current_user.user_id)
    if not aes_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not found. Please contact support."
        )
    
    # Security: Encrypt application password and account username
    encrypted_password = aes_encrypt(application_password, aes_key)
    encrypted_username = aes_encrypt(account_user_name, aes_key)
    
    try:
        # Security: Create password entry with encrypted data
        # Use direct INSERT to handle password_id AUTO_INCREMENT properly
        from sqlalchemy import text
        
        # Try to get the next password_id if AUTO_INCREMENT is not set
        try:
            # First, try INSERT without password_id (if AUTO_INCREMENT is set)
            result = await db.execute(
                text("""
                    INSERT INTO passwords (user_id, application_name, application_type, account_user_name, application_password, datetime_added, pswd_strength, year1, year2, year3, year4, year5)
                    VALUES (:user_id, :application_name, :application_type, :account_user_name, :application_password, :datetime_added, :pswd_strength, :year1, :year2, :year3, :year4, :year5)
                """),
                {
                    "user_id": current_user.user_id,
                    "application_name": application_name,
                    "application_type": application_type,
                    "account_user_name": encrypted_username,
                    "application_password": encrypted_password,
                    "datetime_added": datetime.utcnow(),
                    "pswd_strength": strength,
                    "year1": None,
                    "year2": None,
                    "year3": None,
                    "year4": None,
                    "year5": None
                }
            )
            await db.commit()
            
            # Get the inserted password_id using LAST_INSERT_ID() or by querying
            password_result = await db.execute(
                text("SELECT LAST_INSERT_ID() as password_id")
            )
            last_id_row = password_result.first()
            if last_id_row and last_id_row.password_id:
                password_id = last_id_row.password_id
            else:
                # Fallback: get the max password_id for this user
                password_result = await db.execute(
                    text("SELECT password_id FROM passwords WHERE user_id = :user_id ORDER BY password_id DESC LIMIT 1"),
                    {"user_id": current_user.user_id}
                )
                password_row = password_result.first()
                if not password_row:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create password"
                    )
                password_id = password_row.password_id
        except Exception as insert_error:
            # If AUTO_INCREMENT is not set, manually get next ID
            error_str = str(insert_error).lower()
            if "doesn't have a default value" in error_str or "1364" in error_str:
                await db.rollback()
                # Get the max password_id and add 1
                max_id_result = await db.execute(
                    text("SELECT COALESCE(MAX(password_id), 0) + 1 as next_id FROM passwords")
                )
                max_id_row = max_id_result.first()
                if not max_id_row:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create password"
                    )
                password_id = max_id_row.next_id
                
                # Insert with explicit password_id
                result = await db.execute(
                    text("""
                        INSERT INTO passwords (password_id, user_id, application_name, application_type, account_user_name, application_password, datetime_added, pswd_strength, year1, year2, year3, year4, year5)
                        VALUES (:password_id, :user_id, :application_name, :application_type, :account_user_name, :application_password, :datetime_added, :pswd_strength, :year1, :year2, :year3, :year4, :year5)
                    """),
                    {
                        "password_id": password_id,
                        "user_id": current_user.user_id,
                        "application_name": application_name,
                        "application_type": application_type,
                        "account_user_name": encrypted_username,
                        "application_password": encrypted_password,
                        "datetime_added": datetime.utcnow(),
                        "pswd_strength": strength,
                        "year1": None,
                        "year2": None,
                        "year3": None,
                        "year4": None,
                        "year5": None
                    }
                )
                await db.commit()
            else:
                raise
        
        # Create Password object for response
        new_password = Password(
            password_id=password_id,
            user_id=current_user.user_id,
            application_name=application_name,
            application_type=application_type,
            account_user_name=encrypted_username,
            application_password=encrypted_password,
            pswd_strength=strength,
            datetime_added=datetime.utcnow()
        )
        
        return PasswordResponse.model_validate(new_password)
    except Exception as e:
        await db.rollback()
        # Log full error for debugging
        logging.error(f"Error creating password: {e}", exc_info=True)
        # Return user-friendly error message
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create password. Please try again."
        )


@router.get("", response_model=PasswordListResponse)
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def get_passwords(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    application_name: str = None,
    application_type: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all passwords for current user
    Security: Authentication required, user isolation
    """
    # Security: Query only user's passwords
    query = select(Password).where(Password.user_id == current_user.user_id)
    
    if application_name:
        # Security: Sanitize application name
        app_name = sanitize_input(application_name, 255)
        query = query.where(Password.application_name == app_name)
    
    if application_type:
        # Security: Sanitize application type
        app_type = sanitize_input(application_type, 255)
        query = query.where(Password.application_type == app_type)
    
    query = query.order_by(Password.datetime_added.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    passwords = result.scalars().all()
    
    # Security: Load user's AES key for decryption
    aes_key = load_user_aes_key(current_user.user_id)
    if not aes_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not found. Please contact support."
        )
    
    # Security: Decrypt passwords before returning
    decrypted_passwords = []
    for p in passwords:
        try:
            # Security: Decrypt application password and username
            decrypted_password = aes_decrypt(p.application_password, aes_key)
            decrypted_username = aes_decrypt(p.account_user_name, aes_key)
            
            # Security: Create temporary object with decrypted data
            p_dict = {
                "password_id": p.password_id,
                "user_id": p.user_id,
                "application_name": p.application_name,
                "application_type": p.application_type,
                "account_user_name": decrypted_username,
                "application_password": decrypted_password,
                "datetime_added": p.datetime_added,
                "pswd_strength": p.pswd_strength
            }
            decrypted_passwords.append(PasswordResponse(**p_dict))
        except ValueError as e:
            # Security: Skip passwords that can't be decrypted (legacy or corrupted)
            logging.warning(f"Failed to decrypt password {p.password_id}: {str(e)}")
            continue
    
    # Security: Get total count
    count_query = select(func.count(Password.password_id)).where(Password.user_id == current_user.user_id)
    if application_name:
        count_query = count_query.where(Password.application_name == application_name)
    if application_type:
        app_type = sanitize_input(application_type, 255)
        count_query = count_query.where(Password.application_type == app_type)
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    return PasswordListResponse(
        passwords=decrypted_passwords,
        total=total
    )


@router.get("/recent", response_model=List[PasswordResponse])
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def get_recent_passwords(
    request: Request,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recently added passwords
    Security: Authentication required, limit results
    """
    # Security: Limit maximum results
    limit = min(limit, 100)
    
    result = await db.execute(
        select(Password)
        .where(Password.user_id == current_user.user_id)
        .order_by(Password.datetime_added.desc())
        .limit(limit)
    )
    passwords = result.scalars().all()
    
    # Security: Load user's AES key for decryption
    aes_key = load_user_aes_key(current_user.user_id)
    if not aes_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not found. Please contact support."
        )
    
    # Security: Decrypt passwords before returning
    decrypted_passwords = []
    for p in passwords:
        try:
            decrypted_password = aes_decrypt(p.application_password, aes_key)
            decrypted_username = aes_decrypt(p.account_user_name, aes_key)
            p_dict = {
                "password_id": p.password_id,
                "user_id": p.user_id,
                "application_name": p.application_name,
                "application_type": p.application_type,
                "account_user_name": decrypted_username,
                "application_password": decrypted_password,
                "datetime_added": p.datetime_added,
                "pswd_strength": p.pswd_strength
            }
            decrypted_passwords.append(PasswordResponse(**p_dict))
        except ValueError as e:
            logging.warning(f"Failed to decrypt password {p.password_id}: {str(e)}")
            continue
    
    return decrypted_passwords


@router.get("/{password_id}", response_model=PasswordResponse)
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def get_password(
    request: Request,
    password_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific password
    Security: Authentication required, authorization check
    """
    result = await db.execute(
        select(Password).where(
            and_(Password.password_id == password_id, Password.user_id == current_user.user_id)
        )
    )
    password = result.scalar_one_or_none()
    
    if password is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Password not found"
        )
    
    # Security: Load user's AES key and decrypt
    aes_key = load_user_aes_key(current_user.user_id)
    if not aes_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not found. Please contact support."
        )
    
    try:
        decrypted_password = aes_decrypt(password.application_password, aes_key)
        decrypted_username = aes_decrypt(password.account_user_name, aes_key)
        p_dict = {
            "password_id": password.password_id,
            "user_id": password.user_id,
            "application_name": password.application_name,
            "application_type": password.application_type,
            "account_user_name": decrypted_username,
            "application_password": decrypted_password,
            "datetime_added": password.datetime_added,
            "pswd_strength": password.pswd_strength
        }
        return PasswordResponse(**p_dict)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt password data"
        )


@router.put("/{password_id}", response_model=PasswordResponse)
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def update_password(
    request: Request,
    password_id: int,
    password_data: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a password
    Security: Authentication required, authorization check, password rotation
    """
    # Security: Query password with authorization check
    result = await db.execute(
        select(Password).where(
            and_(Password.password_id == password_id, Password.user_id == current_user.user_id)
        )
    )
    password = result.scalar_one_or_none()
    
    if password is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Password not found"
        )
    
    # Security: Load user's AES key
    aes_key = load_user_aes_key(current_user.user_id)
    if not aes_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not found. Please contact support."
        )
    
    # Security: Password rotation (year1 -> year2, year2 -> year3, etc.)
    password.year5 = password.year4
    password.year4 = password.year3
    password.year3 = password.year2
    password.year2 = password.year1
    password.year1 = password.application_password
    
    # Security: Encrypt new password before storing
    encrypted_password = aes_encrypt(sanitize_input(password_data.application_password, 100), aes_key)
    password.application_password = encrypted_password
    
    # Security: Update other fields if provided
    if password_data.application_name:
        password.application_name = sanitize_input(password_data.application_name, 255)
    if password_data.account_user_name:
        # Security: Encrypt username if updated
        encrypted_username = aes_encrypt(sanitize_input(password_data.account_user_name, 255), aes_key)
        password.account_user_name = encrypted_username
    
    # Security: Recalculate strength (use plaintext for calculation)
    password.pswd_strength = calculate_password_strength(password_data.application_password)
    password.datetime_added = datetime.utcnow()
    
    await db.commit()
    await db.refresh(password)
    
    return PasswordResponse.model_validate(password)


@router.delete("/{password_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def delete_password(
    request: Request,
    password_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a password
    Security: Authentication required, authorization check
    """
    # Security: Query password with authorization check
    result = await db.execute(
        select(Password).where(
            and_(Password.password_id == password_id, Password.user_id == current_user.user_id)
        )
    )
    password = result.scalar_one_or_none()
    
    if password is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Password not found"
        )
    
    await db.delete(password)
    await db.commit()
    
    return None


@router.get("/applications/list", response_model=List[dict])
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def get_applications(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of applications with account counts
    Security: Authentication required, aggregated data
    """
    result = await db.execute(
        select(
            Password.application_name,
            func.count(Password.password_id).label("total_accounts")
        )
        .where(Password.user_id == current_user.user_id)
        .group_by(Password.application_name)
        .order_by(Password.application_name)
    )
    
    applications = result.all()
    
    return [
        {"application_name": app.application_name, "total_accounts": app.total_accounts}
        for app in applications
    ]


@router.get("/application-types/list", response_model=List[dict])
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def get_application_types(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of application types with password counts
    Security: Authentication required, aggregated data
    """
    result = await db.execute(
        select(
            Password.application_type,
            func.count(Password.password_id).label("total_passwords")
        )
        .where(
            and_(
                Password.user_id == current_user.user_id,
                Password.application_type.isnot(None),
                Password.application_type != ""
            )
        )
        .group_by(Password.application_type)
        .order_by(Password.application_type)
    )
    
    application_types = result.all()
    
    return [
        {"application_type": app_type.application_type, "total_passwords": app_type.total_passwords}
        for app_type in application_types
    ]


@router.get("/applications/{application_name}", response_model=List[PasswordResponse])
@limiter.limit(settings.RATE_LIMIT_PASSWORD)
async def get_passwords_by_application(
    request: Request,
    application_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all passwords for a specific application
    Security: Authentication required, authorization check
    """
    # Security: Sanitize application name
    app_name = sanitize_input(application_name, 255)
    
    result = await db.execute(
        select(Password).where(
            and_(
                Password.user_id == current_user.user_id,
                Password.application_name == app_name
            )
        ).order_by(Password.account_user_name)
    )
    passwords = result.scalars().all()
    
    # Security: Load user's AES key and decrypt
    aes_key = load_user_aes_key(current_user.user_id)
    if not aes_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Encryption key not found. Please contact support."
        )
    
    # Security: Decrypt passwords before returning
    decrypted_passwords = []
    for p in passwords:
        try:
            decrypted_password = aes_decrypt(p.application_password, aes_key)
            decrypted_username = aes_decrypt(p.account_user_name, aes_key)
            p_dict = {
                "password_id": p.password_id,
                "user_id": p.user_id,
                "application_name": p.application_name,
                "application_type": p.application_type,
                "account_user_name": decrypted_username,
                "application_password": decrypted_password,
                "datetime_added": p.datetime_added,
                "pswd_strength": p.pswd_strength
            }
            decrypted_passwords.append(PasswordResponse(**p_dict))
        except ValueError as e:
            logging.warning(f"Failed to decrypt password {p.password_id}: {str(e)}")
            continue
    
    return decrypted_passwords

