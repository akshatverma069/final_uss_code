"""
Security middleware for FastAPI
Security: CORS, security headers, rate limiting, request logging
"""
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import time
from app.config import settings

# Security: Rate limiting
limiter = Limiter(key_func=get_remote_address)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    Security: Defense against various attacks
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security: Strict-Transport-Security (HSTS)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Security: X-Content-Type-Options
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Security: X-Frame-Options (clickjacking protection)
        response.headers["X-Frame-Options"] = "DENY"
        
        # Security: X-XSS-Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Security: Content-Security-Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        
        # Security: Referrer-Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Security: Permissions-Policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=()"
        )
        
        # Security: Remove server header
        if "server" in response.headers:
            del response.headers["server"]
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Log security-relevant requests
    Security: Audit trail for security events
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request
        if settings.LOG_SECURITY_EVENTS:
            print(f"[SECURITY] {request.method} {request.url.path} from {get_remote_address(request)}")
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        # Security: Log failed authentication attempts
        if response.status_code == 401 or response.status_code == 403:
            print(f"[SECURITY ALERT] Failed authentication: {request.method} {request.url.path} from {get_remote_address(request)}")
        
        return response


def setup_middleware(app):
    """
    Setup all security middleware
    Security: Comprehensive security middleware stack
    """
    # Security: CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_CREDENTIALS,
        allow_methods=settings.CORS_METHODS,
        allow_headers=settings.CORS_HEADERS,
        expose_headers=["X-Process-Time"],
    )
    
    # Security: Trusted host middleware
    if not settings.DEBUG:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["*"]  # Configure with specific hosts in production
        )
    
    # Security: Security headers middleware
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Security: Request logging middleware
    app.add_middleware(RequestLoggingMiddleware)
    
    # Security: Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    return app

