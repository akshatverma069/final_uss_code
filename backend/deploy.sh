#!/bin/bash

# Deployment script for Password Manager Backend on VM
# This script sets up the backend to run as a systemd service

set -e

echo "🔒 Password Manager Backend Deployment Script"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="password-manager-api"
SERVICE_USER="uss-lousser"
APP_DIR="/home/${SERVICE_USER}/password-manager-backend"
VENV_DIR="${APP_DIR}/venv"
PYTHON_BIN="${VENV_DIR}/bin/python"
UVICORN_BIN="${VENV_DIR}/bin/uvicorn"

# Check if running as root for systemd setup
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Note: Some operations require root privileges${NC}"
    echo "Please run with sudo for full deployment: sudo $0"
fi

echo "📦 Step 1: Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv python3-dev
sudo apt-get install -y libmysqlclient-dev build-essential
sudo apt-get install -y nginx  # Optional: for reverse proxy

echo ""
echo "📁 Step 2: Creating application directory..."
mkdir -p ${APP_DIR}
cd ${APP_DIR}

echo ""
echo "🐍 Step 3: Creating virtual environment..."
if [ ! -d "${VENV_DIR}" ]; then
    python3 -m venv ${VENV_DIR}
fi

echo ""
echo "📥 Step 4: Installing Python dependencies..."
source ${VENV_DIR}/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "⚙️  Step 5: Configuring environment..."
if [ ! -f "${APP_DIR}/.env" ]; then
    cat > ${APP_DIR}/.env << EOF
# Server Configuration
PORT=8000
NODE_ENV=production
DEBUG=False

# Database Configuration
DB_HOST=192.168.2.234
DB_USER=uss-lousser
DB_PASSWORD=l4o8u5d1
DB_NAME=uss_database
DB_PORT=3306

# JWT Configuration - SECURITY: Generate a strong secret key
JWT_SECRET_KEY=$(openssl rand -hex 32)

# Security: Password hashing
PASSWORD_HASH_ALGORITHM=argon2

# Security: Rate limiting
RATE_LIMIT_ENABLED=True

# Security: CORS - Add your frontend URLs
CORS_ORIGINS=["http://192.168.2.234:8000","*"]

# Security: Encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)
EOF
    echo -e "${GREEN}✅ Created .env file${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists, skipping...${NC}"
fi

echo ""
echo "🔧 Step 6: Creating systemd service..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << EOF
[Unit]
Description=Password Manager API Backend
After=network.target mysql.service

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${APP_DIR}
Environment="PATH=${VENV_DIR}/bin"
ExecStart=${UVICORN_BIN} app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

# Security: Limit resources
LimitNOFILE=65536
MemoryLimit=512M

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "🔄 Step 7: Reloading systemd and enabling service..."
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl start ${SERVICE_NAME}

echo ""
echo "⏳ Step 8: Waiting for service to start..."
sleep 5

echo ""
echo "✅ Step 9: Checking service status..."
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    echo -e "${GREEN}✅ Service is running!${NC}"
    sudo systemctl status ${SERVICE_NAME} --no-pager -l
else
    echo -e "${RED}❌ Service failed to start${NC}"
    sudo systemctl status ${SERVICE_NAME} --no-pager -l
    exit 1
fi

echo ""
echo "🔍 Step 10: Testing API endpoint..."
sleep 2
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is responding!${NC}"
else
    echo -e "${YELLOW}⚠️  API health check failed, but service is running${NC}"
fi

echo ""
echo "📋 Deployment Summary:"
echo "======================"
echo "Service Name: ${SERVICE_NAME}"
echo "Application Dir: ${APP_DIR}"
echo "Service Status: $(sudo systemctl is-active ${SERVICE_NAME})"
echo "API URL: http://192.168.2.234:8000"
echo ""
echo "📝 Useful Commands:"
echo "  Check status: sudo systemctl status ${SERVICE_NAME}"
echo "  View logs: sudo journalctl -u ${SERVICE_NAME} -f"
echo "  Restart service: sudo systemctl restart ${SERVICE_NAME}"
echo "  Stop service: sudo systemctl stop ${SERVICE_NAME}"
echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"





