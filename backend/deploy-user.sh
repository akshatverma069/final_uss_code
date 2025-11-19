#!/bin/bash

# User-space deployment script (NO SUDO REQUIRED)
# This script deploys the backend to a remote server without requiring root access
# Usage: ./deploy-user.sh [config_file]
# Example: ./deploy-user.sh deploy.config

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load configuration
CONFIG_FILE="${1:-deploy.config}"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${NC}"
    echo "Please create $CONFIG_FILE or specify a different config file."
    exit 1
fi

echo -e "${BLUE}📋 Loading configuration from $CONFIG_FILE...${NC}"
source "$CONFIG_FILE"

# Validate required variables
if [ -z "$DEPLOY_IP" ] || [ -z "$DEPLOY_USER" ]; then
    echo -e "${RED}❌ Missing required configuration: DEPLOY_IP and DEPLOY_USER must be set${NC}"
    exit 1
fi

REMOTE_DIR="${REMOTE_DIR:-password-manager-backend}"
REMOTE_PATH="~/${REMOTE_DIR}"
API_PORT="${API_PORT:-8000}"

echo ""
echo -e "${GREEN}🚀 Deploying Password Manager Backend (User-Space)${NC}"
echo "=============================================="
echo -e "Server: ${BLUE}${DEPLOY_USER}@${DEPLOY_IP}${NC}"
echo -e "Remote Path: ${BLUE}${REMOTE_PATH}${NC}"
echo -e "API Port: ${BLUE}${API_PORT}${NC}"
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}⚠️  sshpass is not installed.${NC}"
    echo "Installing sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install hudochenkov/sshpass/sshpass
        else
            echo -e "${RED}❌ Please install Homebrew first: https://brew.sh${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y sshpass 2>/dev/null || {
            echo -e "${YELLOW}⚠️  Could not install sshpass with sudo. Please install manually:${NC}"
            echo "  sudo apt-get install sshpass"
            echo "Or use SSH keys instead of password authentication"
            exit 1
        }
    else
        echo -e "${YELLOW}⚠️  Please install sshpass manually for your OS${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}📦 Step 1: Creating deployment package...${NC}"
# Create tarball excluding unnecessary files
tar -czf ../backend-deploy.tar.gz \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='node_modules' \
    .

cd ..

echo -e "${BLUE}📤 Step 2: Copying files to server...${NC}"
if [ -n "$DEPLOY_PASSWORD" ]; then
    sshpass -p "${DEPLOY_PASSWORD}" scp -o StrictHostKeyChecking=no backend-deploy.tar.gz ${DEPLOY_USER}@${DEPLOY_IP}:~/
    sshpass -p "${DEPLOY_PASSWORD}" scp -o StrictHostKeyChecking=no backend/remote-setup.sh ${DEPLOY_USER}@${DEPLOY_IP}:~/
    sshpass -p "${DEPLOY_PASSWORD}" scp -o StrictHostKeyChecking=no backend/run-service.sh ${DEPLOY_USER}@${DEPLOY_IP}:~/
else
    scp -o StrictHostKeyChecking=no backend-deploy.tar.gz ${DEPLOY_USER}@${DEPLOY_IP}:~/
    scp -o StrictHostKeyChecking=no backend/remote-setup.sh ${DEPLOY_USER}@${DEPLOY_IP}:~/
    scp -o StrictHostKeyChecking=no backend/run-service.sh ${DEPLOY_USER}@${DEPLOY_IP}:~/
fi

echo -e "${BLUE}🔧 Step 3: Setting up on remote server (user-space, no sudo)...${NC}"

# Create the remote setup command
REMOTE_SETUP_CMD=$(cat <<ENDSSH
set -e
cd ~
# Stop existing service if running
if [ -f "${REMOTE_DIR}/run-service.sh" ] && [ -f "${REMOTE_DIR}/app.pid" ]; then
    echo "Stopping existing service..."
    cd ${REMOTE_DIR}
    ./run-service.sh stop 2>/dev/null || true
    cd ~
fi
mkdir -p ${REMOTE_DIR}
cd ${REMOTE_DIR}
echo "Extracting files..."
tar -xzf ~/backend-deploy.tar.gz
rm ~/backend-deploy.tar.gz
chmod +x ~/remote-setup.sh
chmod +x ~/run-service.sh
chmod +x ${REMOTE_DIR}/run-service.sh
cd ${REMOTE_DIR}
~/remote-setup.sh "${REMOTE_DIR}" "${API_PORT}" "${DB_HOST}" "${DB_USER}" "${DB_PASSWORD}" "${DB_NAME}" "${DB_PORT}"
echo ""
echo "Starting service..."
./run-service.sh start || echo "Service start failed, you can start it manually with: ./run-service.sh start"
ENDSSH
)

if [ -n "$DEPLOY_PASSWORD" ]; then
    sshpass -p "${DEPLOY_PASSWORD}" ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_IP} "$REMOTE_SETUP_CMD"
else
    ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_IP} "$REMOTE_SETUP_CMD"
fi

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "======================"
echo -e "Server: ${DEPLOY_USER}@${DEPLOY_IP}"
echo -e "Remote Path: ${REMOTE_PATH}"
echo -e "API URL: http://${DEPLOY_IP}:${API_PORT}"
echo -e "Health Check: http://${DEPLOY_IP}:${API_PORT}/health"
echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo "  Check if service is running:"
echo "    ssh ${DEPLOY_USER}@${DEPLOY_IP} 'ps aux | grep uvicorn'"
echo ""
echo "  View logs:"
echo "    ssh ${DEPLOY_USER}@${DEPLOY_IP} 'tail -f ~/${REMOTE_DIR}/app.log'"
echo ""
echo "  Start service:"
echo "    ssh ${DEPLOY_USER}@${DEPLOY_IP} 'cd ~/${REMOTE_DIR} && ./run-service.sh start'"
echo ""
echo "  Stop service:"
echo "    ssh ${DEPLOY_USER}@${DEPLOY_IP} 'cd ~/${REMOTE_DIR} && ./run-service.sh stop'"
echo ""
echo "  Restart service:"
echo "    ssh ${DEPLOY_USER}@${DEPLOY_IP} 'cd ~/${REMOTE_DIR} && ./run-service.sh restart'"
echo ""

# Cleanup
rm -f backend-deploy.tar.gz