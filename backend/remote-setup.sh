#!/bin/bash

# Remote setup script (runs on target server, NO SUDO REQUIRED)
# This script sets up the backend in user-space

set -e

REMOTE_DIR="${1:-password-manager-backend}"
API_PORT="${2:-8000}"
DB_HOST="${3:-192.168.2.234}"
DB_USER="${4:-uss-lousser}"
DB_PASSWORD="${5:-l4o8u5d1}"
DB_NAME="${6:-uss_database}"
DB_PORT="${7:-3306}"

APP_DIR="$HOME/${REMOTE_DIR}"
VENV_DIR="${APP_DIR}/venv"
LOG_FILE="${APP_DIR}/app.log"
PID_FILE="${APP_DIR}/app.pid"

echo "🔧 Setting up Password Manager Backend (User-Space)"
echo "=================================================="
echo "App Directory: ${APP_DIR}"
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed."
    echo "Please install Python 3.8 or higher:"
    echo "  For Ubuntu/Debian: sudo apt-get install python3 python3-pip python3-venv"
    echo "  For CentOS/RHEL: sudo yum install python3 python3-pip"
    exit 1
fi

cd "$APP_DIR"

# Create virtual environment
echo "🐍 Creating virtual environment..."
if [ ! -d "${VENV_DIR}" ]; then
    python3 -m venv "${VENV_DIR}"
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate and install dependencies
echo ""
echo "📥 Installing Python dependencies..."
source "${VENV_DIR}/bin/activate"
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo "✅ Dependencies installed"

# Create .env file if it doesn't exist
echo ""
echo "⚙️  Configuring environment..."
if [ ! -f "${APP_DIR}/.env" ]; then
    # Generate secure keys
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    ENCRYPTION_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    
    cat > "${APP_DIR}/.env" << EOF
# Server Configuration
PORT=${API_PORT}
NODE_ENV=production
DEBUG=False

# Database Configuration
DB_HOST=${DB_HOST}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
DB_PORT=${DB_PORT}

# JWT Configuration
JWT_SECRET_KEY=${JWT_SECRET}

# Security: Password hashing
PASSWORD_HASH_ALGORITHM=argon2

# Security: Rate limiting
RATE_LIMIT_ENABLED=True

# Security: CORS
CORS_ORIGINS=["*"]

# Security: Encryption key
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Logging
LOG_LEVEL=INFO
LOG_SECURITY_EVENTS=True
EOF
    echo "✅ Created .env file with secure keys"
else
    echo "⚠️  .env file already exists, skipping..."
fi

# Make run-service.sh executable
chmod +x "${APP_DIR}/run-service.sh" 2>/dev/null || true

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "To start the service, run:"
echo "  cd ${APP_DIR}"
echo "  ./run-service.sh start"