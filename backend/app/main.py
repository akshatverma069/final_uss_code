"""
FastAPI Main Application
Security: Comprehensive security configuration and middleware
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.encoders import jsonable_encoder
from app.config import settings
from app.database import test_connection
from app.middleware import setup_middleware
from app.routers import auth, passwords, groups, security, faqs, messages
from app.routers import users as users_router
import uvicorn
import logging

# Security: Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Security: Create FastAPI app with security settings
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Secure Password Manager API with comprehensive security measures",
    docs_url="/docs" if settings.DEBUG else None,  # Security: Disable docs in production
    redoc_url="/redoc" if settings.DEBUG else None,  # Security: Disable redoc in production
)

# Security: Setup middleware
app = setup_middleware(app)


# Security: Exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Custom HTTP exception handler
    Security: Generic error messages to prevent information leakage
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail if settings.DEBUG else "An error occurred",
            "status_code": exc.status_code
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Custom validation exception handler
    Security: Sanitized error messages
    """
    details = exc.errors() if settings.DEBUG else "Invalid input"
    safe_details = jsonable_encoder(details)

    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation error",
            "details": safe_details
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    General exception handler
    Security: No sensitive information in error messages
    """
    logging.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error" if not settings.DEBUG else str(exc)
        }
    )


# Security: Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_status = await test_connection()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "version": settings.VERSION
    }


# Security: Include routers
app.include_router(auth.router)
app.include_router(passwords.router)
app.include_router(groups.router)
app.include_router(security.router)
app.include_router(faqs.router)
app.include_router(messages.router)
app.include_router(users_router.router)


# Security: Startup event
@app.on_event("startup")
async def startup_event():
    """Startup event with security checks"""
    print("=" * 50)
    print("🔒 Password Manager API Starting")
    print("=" * 50)
    print(f"Version: {settings.VERSION}")
    print(f"Environment: {'Development' if settings.DEBUG else 'Production'}")
    
    # Security: Test database connection
    db_connected = await test_connection()
    if not db_connected:
        print("⚠️  WARNING: Database connection failed!")
    
    print("=" * 50)
    print("✅ API is ready to accept requests")
    print("=" * 50)


# Security: Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Password Manager API",
        "version": settings.VERSION,
        "docs": "/docs" if settings.DEBUG else "Disabled in production"
    }


if __name__ == "__main__":
    # Security: Run with uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )

