#!/bin/bash

# Quick deployment script to copy files to VM and deploy
# Usage: ./deploy-vm.sh

set -e

VM_IP="192.168.2.234"
VM_USER="uss-lousser"
VM_PASSWORD="l4o8u5d1"
REMOTE_DIR="/home/${VM_USER}/password-manager-backend"

echo "🚀 Deploying Password Manager Backend to VM"
echo "============================================"
echo "VM: ${VM_USER}@${VM_IP}"
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass is not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y sshpass
    fi
fi

echo "📦 Step 1: Creating deployment package..."
tar -czf ../backend-deploy.tar.gz --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' .
cd ..

echo "📤 Step 2: Copying files to VM..."
sshpass -p "${VM_PASSWORD}" scp -o StrictHostKeyChecking=no backend-deploy.tar.gz ${VM_USER}@${VM_IP}:~/
sshpass -p "${VM_PASSWORD}" scp backend/deploy.sh ${VM_USER}@${VM_IP}:~/

echo "🔧 Step 3: Extracting and setting up on VM..."
sshpass -p "${VM_PASSWORD}" ssh -o StrictHostKeyChecking=no ${VM_USER}@${VM_IP} << 'ENDSSH'
mkdir -p ~/password-manager-backend
cd ~/password-manager-backend
tar -xzf ~/backend-deploy.tar.gz
rm ~/backend-deploy.tar.gz
chmod +x ~/deploy.sh
sudo ~/deploy.sh
ENDSSH

echo ""
echo "✅ Deployment completed!"
echo "🌐 API URL: http://${VM_IP}:8000"
echo "📊 Health Check: http://${VM_IP}:8000/health"
echo ""
echo "To check service status on VM:"
echo "  ssh ${VM_USER}@${VM_IP}"
echo "  sudo systemctl status password-manager-api"

# Cleanup
rm backend-deploy.tar.gz



