# VM Deployment Guide

This guide explains how to deploy the Password Manager Backend on your VM so it runs automatically and doesn't require any manual intervention.

## Prerequisites

- VM IP: 192.168.2.234
- VM User: uss-lousser
- VM Password: l4o8u5d1
- SSH access to the VM
- MySQL database already set up on the VM

## Quick Deployment (Automated)

### Option 1: Automated Deployment from Your Machine

1. **Install sshpass** (for password-based SSH):
   ```bash
   # macOS
   brew install hudochenkov/sshpass/sshpass
   
   # Linux
   sudo apt-get install sshpass
   ```

2. **Run the deployment script**:
   ```bash
   cd backend
   ./deploy-vm.sh
   ```

This script will:
- Package the backend code
- Copy it to the VM
- Set up the systemd service
- Start the service automatically
- Configure it to start on boot

### Option 2: Manual Deployment

#### Step 1: Initial VM Setup

SSH into your VM:
```bash
ssh uss-lousser@192.168.2.234
```

Run the setup script on the VM:
```bash
cd ~
wget https://raw.githubusercontent.com/your-repo/password-manager/main/backend/setup-vm.sh
chmod +x setup-vm.sh
sudo ./setup-vm.sh
```

#### Step 2: Copy Backend Files to VM

From your local machine:
```bash
cd backend
tar -czf ../backend-deploy.tar.gz --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' .
scp backend-deploy.tar.gz uss-lousser@192.168.2.234:~/
```

On the VM:
```bash
mkdir -p ~/password-manager-backend
cd ~/password-manager-backend
tar -xzf ~/backend-deploy.tar.gz
```

#### Step 3: Configure Environment

On the VM:
```bash
cd ~/password-manager-backend
cp production.env .env
nano .env  # Edit and update with actual values
```

Generate secure keys:
```bash
# Generate JWT secret
openssl rand -hex 32

# Generate encryption key
openssl rand -hex 32
```

Update `.env` with the generated keys.

#### Step 4: Install Dependencies

On the VM:
```bash
cd ~/password-manager-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Step 5: Set Up Systemd Service

On the VM, create the systemd service:
```bash
sudo nano /etc/systemd/system/password-manager-api.service
```

Add the following content:
```ini
[Unit]
Description=Password Manager API Backend
After=network.target mysql.service

[Service]
Type=simple
User=uss-lousser
WorkingDirectory=/home/uss-lousser/password-manager-backend
Environment="PATH=/home/uss-lousser/password-manager-backend/venv/bin"
ExecStart=/home/uss-lousser/password-manager-backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=password-manager-api

# Security: Limit resources
LimitNOFILE=65536
MemoryLimit=512M

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable password-manager-api
sudo systemctl start password-manager-api
```

#### Step 6: Verify Deployment

Check service status:
```bash
sudo systemctl status password-manager-api
```

Test the API:
```bash
curl http://localhost:8000/health
```

From your local machine:
```bash
curl http://192.168.2.234:8000/health
```

## Service Management

### Check Status
```bash
sudo systemctl status password-manager-api
```

### View Logs
```bash
# View all logs
sudo journalctl -u password-manager-api -f

# View recent logs
sudo journalctl -u password-manager-api -n 100

# View logs from today
sudo journalctl -u password-manager-api --since today
```

### Restart Service
```bash
sudo systemctl restart password-manager-api
```

### Stop Service
```bash
sudo systemctl stop password-manager-api
```

### Start Service
```bash
sudo systemctl start password-manager-api
```

## Updating the Backend

### Option 1: Automated Update

From your local machine:
```bash
cd backend
./update-service.sh
```

### Option 2: Manual Update

1. Make your code changes locally
2. Package and copy to VM:
   ```bash
   cd backend
   tar -czf ../backend-update.tar.gz --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' .
   scp backend-update.tar.gz uss-lousser@192.168.2.234:~/
   ```

3. On the VM:
   ```bash
   cd ~/password-manager-backend
   tar -xzf ~/backend-update.tar.gz
   source venv/bin/activate
   pip install -r requirements.txt --upgrade
   sudo systemctl restart password-manager-api
   ```

## Firewall Configuration

The backend runs on port 8000. Ensure the firewall allows connections:

```bash
# Check firewall status
sudo ufw status

# Allow port 8000 (if not already allowed)
sudo ufw allow 8000/tcp

# Reload firewall
sudo ufw reload
```

## Database Configuration

Ensure MySQL is running and accessible:
```bash
# Check MySQL status
sudo systemctl status mysql

# Test database connection
mysql -u uss-lousser -p -h 192.168.2.234 uss_database
```

## Troubleshooting

### Service Won't Start

1. Check service status:
   ```bash
   sudo systemctl status password-manager-api
   ```

2. Check logs for errors:
   ```bash
   sudo journalctl -u password-manager-api -n 50
   ```

3. Verify Python environment:
   ```bash
   cd ~/password-manager-backend
   source venv/bin/activate
   python --version
   pip list
   ```

4. Test manual start:
   ```bash
   cd ~/password-manager-backend
   source venv/bin/activate
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

### API Not Accessible

1. Check if service is running:
   ```bash
   sudo systemctl status password-manager-api
   ```

2. Check if port is listening:
   ```bash
   sudo netstat -tlnp | grep 8000
   ```

3. Check firewall:
   ```bash
   sudo ufw status
   ```

4. Test locally on VM:
   ```bash
   curl http://localhost:8000/health
   ```

### Database Connection Issues

1. Verify database credentials in `.env`
2. Test database connection:
   ```bash
   mysql -u uss-lousser -p -h 192.168.2.234 uss_database
   ```
3. Check MySQL is running:
   ```bash
   sudo systemctl status mysql
   ```

## Production Checklist

- [ ] Service is enabled to start on boot
- [ ] Firewall is configured correctly
- [ ] Database is accessible
- [ ] Strong JWT secret key is set
- [ ] Strong encryption key is set
- [ ] DEBUG is set to False
- [ ] Logs are being collected
- [ ] Service is running and healthy
- [ ] API is accessible from network
- [ ] CORS is configured correctly

## Security Notes

1. **Change Default Keys**: Always generate new JWT_SECRET_KEY and ENCRYPTION_KEY
2. **Firewall**: Only allow necessary ports
3. **Database**: Use strong passwords and limit access
4. **Logs**: Monitor logs for security events
5. **Updates**: Keep system and dependencies updated
6. **Backups**: Regularly backup database and configuration

## Monitoring

### Health Check Endpoint
```bash
curl http://192.168.2.234:8000/health
```

### Service Monitoring
```bash
# Monitor service status
watch -n 5 'sudo systemctl status password-manager-api'

# Monitor logs in real-time
sudo journalctl -u password-manager-api -f
```

## Next Steps

1. Set up reverse proxy (nginx) for HTTPS (optional)
2. Configure SSL certificates (optional)
3. Set up automated backups
4. Configure monitoring and alerts
5. Set up log rotation

## Support

For issues:
1. Check service logs: `sudo journalctl -u password-manager-api -f`
2. Check service status: `sudo systemctl status password-manager-api`
3. Verify configuration in `.env`
4. Test database connection
5. Check firewall rules

