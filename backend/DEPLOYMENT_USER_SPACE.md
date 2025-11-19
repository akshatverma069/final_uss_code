# User-Space Deployment Guide (No Root Access Required)

This guide explains how to deploy the Password Manager Backend to any server without requiring root/sudo access.

## Quick Start

### 1. Configure Deployment Settings

Edit `deploy.config` with your target server details:

```bash
# Target Server Configuration
DEPLOY_IP=192.168.2.234          # Your server IP
DEPLOY_USER=uss-lousser          # Your username
DEPLOY_PASSWORD=l4o8u5d1         # Your password (optional if using SSH keys)

# Remote Path
REMOTE_DIR=password-manager-backend

# Database Configuration
DB_HOST=192.168.2.234
DB_USER=uss-lousser
DB_PASSWORD=l4o8u5d1
DB_NAME=uss_database
DB_PORT=3306

# API Port
API_PORT=8000
```

### 2. Deploy to Server

```bash
cd backend
chmod +x deploy-user.sh remote-setup.sh run-service.sh manage-remote.sh
./deploy-user.sh
```

That's it! The script will:
- Package your backend code
- Copy it to the remote server
- Set up Python virtual environment
- Install dependencies
- Configure environment variables
- Set up the service (without sudo)

### 3. Start the Service

```bash
# Option 1: SSH to server and run
ssh uss-lousser@192.168.2.234
cd ~/password-manager-backend
./run-service.sh start

# Option 2: Use the management script
./manage-remote.sh start
```

## Deployment to Different Servers

### Deploy to Your PC

1. **Find your PC's IP address:**
   ```bash
   # On Windows
   ipconfig
   
   # On Linux/Mac
   ifconfig
   # or
   ip addr
   ```

2. **Create a new config file:**
   ```bash
   cp deploy.config deploy-pc.config
   ```

3. **Edit `deploy-pc.config`:**
   ```bash
   DEPLOY_IP=192.168.1.100        # Your PC's IP
   DEPLOY_USER=your-username      # Your PC username
   DEPLOY_PASSWORD=your-password  # Your PC password
   ```

4. **Deploy:**
   ```bash
   ./deploy-user.sh deploy-pc.config
   ```

### Deploy to Multiple Servers

Create separate config files for each server:

```bash
# Server 1
./deploy-user.sh deploy-server1.config

# Server 2
./deploy-user.sh deploy-server2.config

# Your PC
./deploy-user.sh deploy-pc.config
```

## Service Management

### On Remote Server

SSH to your server and use `run-service.sh`:

```bash
ssh uss-lousser@192.168.2.234
cd ~/password-manager-backend

# Start service
./run-service.sh start

# Stop service
./run-service.sh stop

# Restart service
./run-service.sh restart

# Check status
./run-service.sh status

# View logs
./run-service.sh logs
```

### From Your Local Machine

Use `manage-remote.sh` to manage the service remotely:

```bash
# Start service
./manage-remote.sh start

# Stop service
./manage-remote.sh stop

# Restart service
./manage-remote.sh restart

# Check status
./manage-remote.sh status

# View logs
./manage-remote.sh logs
```

## How It Works

### No Root Access Required

This deployment solution works entirely in user-space:

1. **No systemd services** - Uses `nohup` to run the process in background
2. **No system-wide installations** - Everything is in the user's home directory
3. **No sudo commands** - All operations use user permissions
4. **Port binding** - Uses user-accessible ports (typically 1024+)

### Process Management

- **PID File**: Tracks the process ID in `app.pid`
- **Logs**: Application logs in `app.log`, errors in `app.error.log`
- **Background Process**: Uses `nohup` to keep running after SSH disconnect

### Directory Structure on Remote Server

```
~/password-manager-backend/
├── app/                    # Application code
├── venv/                   # Python virtual environment
├── .env                    # Environment configuration
├── app.log                 # Application logs
├── app.error.log           # Error logs
├── app.pid                 # Process ID file
├── run-service.sh          # Service management script
└── requirements.txt        # Python dependencies
```

## Troubleshooting

### Service Won't Start

1. **Check Python installation:**
   ```bash
   ssh user@server "python3 --version"
   ```

2. **Check logs:**
   ```bash
   ssh user@server "cat ~/password-manager-backend/app.error.log"
   ```

3. **Check if port is in use:**
   ```bash
   ssh user@server "netstat -tuln | grep 8000"
   ```

### Service Stops After SSH Disconnect

The service should continue running after you disconnect. If it stops:

1. Check if `nohup` is working correctly
2. Verify the process is actually running: `ps aux | grep uvicorn`
3. Check for errors in `app.error.log`

### Port Already in Use

If port 8000 is already in use:

1. Change the port in `deploy.config`:
   ```bash
   API_PORT=8001
   ```

2. Redeploy or update `.env` on the server:
   ```bash
   ssh user@server
   cd ~/password-manager-backend
   # Edit .env and change PORT=8001
   ./run-service.sh restart
   ```

### Database Connection Issues

1. Verify database credentials in `.env`
2. Check if database server is accessible:
   ```bash
   ssh user@server "telnet DB_HOST DB_PORT"
   ```

3. Test database connection:
   ```bash
   ssh user@server "cd ~/password-manager-backend && source venv/bin/activate && python -c 'from app.database import test_connection; import asyncio; asyncio.run(test_connection())'"
   ```

## Security Considerations

### SSH Keys (Recommended)

Instead of using passwords, set up SSH keys:

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t rsa -b 4096

# Copy to server
ssh-copy-id user@server-ip

# Remove password from deploy.config
# DEPLOY_PASSWORD=  # Leave empty or remove line
```

### Firewall

If you need to open ports, you'll need root access. However, many cloud providers allow port configuration through their web interface.

### Environment Variables

Sensitive data (passwords, keys) are stored in `.env` file. Ensure:
- `.env` is not committed to git (already in `.gitignore`)
- File permissions are restricted: `chmod 600 .env`

## Updating the Deployment

To update the code on the server:

```bash
# Just run the deployment script again
./deploy-user.sh

# Then restart the service
./manage-remote.sh restart
```

The deployment script will:
- Stop the existing service
- Update the code
- Restart the service

## Monitoring

### Check if Service is Running

```bash
./manage-remote.sh status
```

### View Real-time Logs

```bash
./manage-remote.sh logs
```

### Health Check

```bash
curl http://SERVER_IP:8000/health
```

## Advanced Usage

### Custom Remote Directory

Edit `deploy.config`:
```bash
REMOTE_DIR=my-custom-backend-path
```

### Multiple Instances

Deploy to different directories:
```bash
# Instance 1
REMOTE_DIR=backend-instance-1
API_PORT=8000
./deploy-user.sh

# Instance 2
REMOTE_DIR=backend-instance-2
API_PORT=8001
./deploy-user.sh deploy-instance2.config
```

## Support

For issues:
1. Check logs: `./manage-remote.sh logs`
2. Check status: `./manage-remote.sh status`
3. Verify configuration in `deploy.config`