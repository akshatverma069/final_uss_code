"""
Database models using SQLAlchemy ORM
Security: Type validation, constraints, relationships
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """User model with security constraints"""
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True, nullable=False)
    # Security: Password stored as hash (SHA256 format for legacy, Argon2 for new)
    pswd = Column(String(255), nullable=False)
    # Security: Group data stored as JSON with validation
    grp = Column(JSON, default=list)
    question_id = Column(Integer, ForeignKey("questions.question_id"), nullable=True)
    answers = Column(Text, nullable=True)  # Security: Answers stored as JSON string
    
    # Relationships
    passwords = relationship("Password", back_populates="user", cascade="all, delete-orphan")
    group_memberships = relationship("GroupMember", back_populates="user")


class Question(Base):
    """Security questions model"""
    __tablename__ = "questions"
    
    question_id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)


class Password(Base):
    """Password model with security features"""
    __tablename__ = "passwords"
    
    password_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    application_name = Column(String(255), nullable=False, index=True)
    application_type = Column(Text, nullable=True, index=True)
    account_user_name = Column(String(255), nullable=False)
    # Security: Password stored encrypted
    application_password = Column(String(100), nullable=False)
    # Security: Timestamp for audit trail
    datetime_added = Column(DateTime, server_default=func.now(), nullable=False)
    # Security: Password strength score (0-100)
    pswd_strength = Column(Integer, default=0)
    # Security: Password history for rotation
    year1 = Column(String(100), nullable=True)
    year2 = Column(String(100), nullable=True)
    year3 = Column(String(100), nullable=True)
    year4 = Column(String(100), nullable=True)
    year5 = Column(String(100), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="passwords")
    group_members = relationship("GroupMember", back_populates="password")


class GroupMember(Base):
    """Group membership model with admin status"""
    __tablename__ = "group_members"
    
    group_name = Column(String(500), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    # Security: Admin status for authorization
    admin_status = Column(Boolean, default=False, nullable=False)
    password_id = Column(Integer, ForeignKey("passwords.password_id", ondelete="CASCADE"), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="group_memberships")
    password = relationship("Password", back_populates="group_members")


class FAQ(Base):
    """FAQ model"""
    __tablename__ = "faqs"
    
    faq_id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)


class Admin(Base):
    """Admin model for system administrators"""
    __tablename__ = "admins"
    
    admin_id = Column(Integer, primary_key=True, index=True)
    admin_username = Column(String(255), unique=True, index=True, nullable=False)
    # Security: Admin password with strong hashing
    pswd_admin = Column(String(255), nullable=False)

