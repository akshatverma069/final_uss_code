@echo off
REM Startup script for Windows

echo 🔒 Starting Password Manager Backend API...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found. Creating from .env.example...
    copy .env.example .env
    echo ⚠️  Please edit .env file with your configuration!
)

REM Start the server
echo.
echo 🚀 Starting FastAPI server...
echo 📍 API will be available at http://0.0.0.0:8000
echo 📚 API Documentation: http://0.0.0.0:8000/docs
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause





