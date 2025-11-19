#!/bin/bash

# Script to update the backend service on VM
# Run this after making code changes

set -e

VM_IP="192.168.2.234"
VM_USER="uss-lousser"
VM_PASSWORD="l4o8u5d1"
SERVICE_NAME="password-manager-api"
REMOTE_DIR="/home/${VM_USER}/password-manager-backend"

echo "🔄 Updating Password Manager Backend Service"
echo "============================================="
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass is not installed. Please install it first."
    exit 1
fi

echo "📦 Step 1: Creating deployment package..."
cd backend
tar -czf ../backend-update.tar.gz --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' .
cd ..

echo "📤 Step 2: Copying files to VM..."
sshpass -p "${VM_PASSWORD}" scp -o StrictHostKeyChecking=no backend-update.tar.gz ${VM_USER}@${VM_IP}:~/

echo "🔄 Step 3: Updating service on VM..."
sshpass -p "${VM_PASSWORD}" ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} << ENDSSH
cd ${REMOTE_DIR}
tar -xzf ~/backend-update.tar.gz
rm ~/backend-update.tar.gz
source venv/bin/activate
pip install -r requirements.txt --upgrade
sudo systemctl restart ${SERVICE_NAME}
sleep 3
sudo systemctl status ${SERVICE_NAME} --no-pager -l | head -20
ENDSSH

echo ""
echo "✅ Update completed!"
echo "🌐 API URL: http://${VM_IP}:8000"

# Cleanup
rm backend-update.tar.gz





