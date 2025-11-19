"""
Pydantic schemas for request/response validation
Security: Input validation, type checking, sanitization
"""
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


# Authentication Schemas
class LoginRequest(BaseModel):
    """Login request schema with validation"""
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    password: str = Field(..., min_length=1, description="Password")
    
    @validator('username')
    def validate_username(cls, v):
        # Security: Username validation
        if not v or len(v) < 3 or len(v) > 50:
            raise ValueError('Username must be between 3 and 50 characters')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain alphanumeric characters, underscores, and hyphens')
        return v


class SignupRequest(BaseModel):
    """Signup request schema with validation"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)
    question_id: int = Field(..., gt=0)
    answer: str = Field(..., min_length=1, max_length=255)
    
    @validator('password')
    def validate_password(cls, v):
        # Security: Password validation
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        # Security: Password confirmation
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str


class SecurityQuestionResponse(BaseModel):
    """Security question response"""
    question_id: int
    question_text: str


# Password Schemas
class PasswordCreate(BaseModel):
    """Create password request schema"""
    application_name: str = Field(..., min_length=1, max_length=255)
    account_user_name: str = Field(..., min_length=1, max_length=255)
    application_password: str = Field(..., min_length=1, max_length=100)
    application_type: Optional[str] = Field(None, max_length=255)
    
    @validator('application_name', 'account_user_name', 'application_password', 'application_type')
    def sanitize_fields(cls, v):
        # Security: Input sanitization
        return v.strip() if v else v


class PasswordUpdate(BaseModel):
    """Update password request schema"""
    application_password: str = Field(..., min_length=1, max_length=100)
    application_name: Optional[str] = Field(None, max_length=255)
    account_user_name: Optional[str] = Field(None, max_length=255)


class PasswordResponse(BaseModel):
    """Password response schema"""
    password_id: int
    user_id: int
    application_name: str
    application_type: Optional[str] = None
    account_user_name: str
    application_password: str
    datetime_added: datetime
    pswd_strength: int
    
    class Config:
        from_attributes = True
        # Pydantic v2 compatibility
        populate_by_name = True


class PasswordListResponse(BaseModel):
    """Password list response"""
    passwords: List[PasswordResponse]
    total: int


# Group Schemas
class GroupMemberCreate(BaseModel):
    """Create group member request"""
    group_name: str = Field(..., min_length=1, max_length=500)
    user_id: int = Field(..., gt=0)
    admin_status: bool = False
    password_id: Optional[int] = None


class GroupMemberResponse(BaseModel):
    """Group member response"""
    group_name: str
    user_id: int
    admin_status: bool
    password_id: Optional[int]
    username: Optional[str] = None
    
    class Config:
        from_attributes = True
        # Pydantic v2 compatibility
        populate_by_name = True


class GroupShareRequest(BaseModel):
    """Share password with group request"""
    group_name: str = Field(..., min_length=1, max_length=500)
    password_id: int = Field(..., gt=0)
    user_ids: List[int] = Field(..., min_items=1)


# Security Analysis Schemas
class PasswordAnalysisResponse(BaseModel):
    """Password analysis response"""
    total_passwords: int
    compromised_count: int
    weak_count: int
    reused_count: int
    strong_count: int
    health_score: int
    compromised_passwords: List[Dict[str, Any]]
    weak_passwords: List[Dict[str, Any]]
    reused_passwords: List[Dict[str, Any]]


# Reset Password Schemas
class ForgotPasswordRequest(BaseModel):
    """Forgot password request"""
    username: str = Field(..., min_length=3, max_length=50)
    question_id: int = Field(..., gt=0)
    answer: str = Field(..., min_length=1, max_length=255)


class ResetPasswordRequest(BaseModel):
    """Reset password request"""
    user_id: int = Field(..., gt=0)
    current_password: Optional[str] = None
    new_password: str = Field(..., min_length=8, max_length=100)
    question_id: Optional[int] = None
    answer: Optional[str] = None
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


# FAQ Schemas
class FAQResponse(BaseModel):
    """FAQ response"""
    faq_id: int
    question: str
    answer: str
    
    class Config:
        from_attributes = True
        # Pydantic v2 compatibility
        populate_by_name = True


# Message/Notification Schemas
class TrustedUserRequest(BaseModel):
    """Trusted user request"""
    username: str = Field(..., min_length=3, max_length=50)
    master_password: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    """Message response"""
    id: str
    type: str
    from_user: str
    from_email: Optional[str] = None
    group_name: Optional[str] = None
    message: str
    timestamp: str
    status: str