#!/bin/bash

# Setup script to be run ON the VM
# This prepares the VM for hosting the backend

set -e

echo "🔧 Setting up VM for Password Manager Backend"
echo "=============================================="
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Python and dependencies
echo "🐍 Installing Python and dependencies..."
sudo apt-get install -y python3 python3-pip python3-venv python3-dev
sudo apt-get install -y libmysqlclient-dev build-essential
sudo apt-get install -y mysql-client

# Install firewall (ufw) if not present
echo "🔥 Configuring firewall..."
sudo apt-get install -y ufw
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 8000/tcp  # API
sudo ufw --force enable

# Create application directory
echo "📁 Creating application directory..."
mkdir -p ~/password-manager-backend
cd ~/password-manager-backend

# Create virtual environment
echo "🐍 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install basic dependencies
echo "📥 Installing basic dependencies..."
pip install --upgrade pip
pip install fastapi uvicorn python-multipart

# Create .env file template
echo "⚙️  Creating .env template..."
cat > .env.template << 'EOF'
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
JWT_SECRET_KEY=CHANGE_THIS_TO_A_STRONG_SECRET_KEY

# Security: Password hashing
PASSWORD_HASH_ALGORITHM=argon2

# Security: Rate limiting
RATE_LIMIT_ENABLED=True

# Security: CORS
CORS_ORIGINS=["*"]

# Security: Encryption key
ENCRYPTION_KEY=CHANGE_THIS_TO_A_STRONG_ENCRYPTION_KEY
EOF

echo ""
echo "✅ VM setup completed!"
echo ""
echo "Next steps:"
echo "1. Copy your backend files to ~/password-manager-backend"
echo "2. Copy .env.template to .env and configure it"
echo "3. Run: source venv/bin/activate && pip install -r requirements.txt"
echo "4. Run: sudo ./deploy.sh (to set up systemd service)"





