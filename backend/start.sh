#!/bin/bash

# Startup script for Password Manager Backend
# Security: Proper environment setup

echo "🔒 Starting Password Manager Backend API..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration!"
fi

# Run database migration (if needed)
echo "🗄️  Checking database connection..."
python3 -c "from app.database import test_connection; import asyncio; asyncio.run(test_connection())"

# Start the server
echo ""
echo "🚀 Starting FastAPI server..."
echo "📍 API will be available at http://0.0.0.0:8000"
echo "📚 API Documentation: http://0.0.0.0:8000/docs"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload





