# Complete Deployment Guide

## Overview

This guide covers deploying the Password Manager application with the backend running on your VM (192.168.2.234) and the mobile app connecting to it.

## Architecture

- **Backend**: FastAPI server running on VM (192.168.2.234:8000)
- **Frontend**: React Native mobile app
- **Database**: MySQL on VM (192.168.2.234:3306)

## Quick Start

### 1. Deploy Backend to VM

```bash
cd backend
./deploy-vm.sh
```

This will:
- Copy backend files to VM
- Set up systemd service
- Start the service
- Configure auto-start on boot

### 2. Verify Backend is Running

```bash
# From your local machine
curl http://192.168.2.234:8000/health

# Or SSH into VM and check
ssh uss-lousser@192.168.2.234
sudo systemctl status password-manager-api
```

### 3. Build and Deploy Mobile App

The mobile app is already configured to connect to `http://192.168.2.234:8000`.

Build your React Native app:
```bash
# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

## Backend Deployment Details

### Automated Deployment

The `deploy-vm.sh` script handles everything automatically:

1. Packages backend code
2. Copies to VM
3. Sets up virtual environment
4. Installs dependencies
5. Creates systemd service
6. Starts and enables service

### Manual Deployment

See `VM_DEPLOYMENT_GUIDE.md` for detailed manual deployment steps.

## Service Management

### On VM

```bash
# Check status
sudo systemctl status password-manager-api

# View logs
sudo journalctl -u password-manager-api -f

# Restart service
sudo systemctl restart password-manager-api

# Stop service
sudo systemctl stop password-manager-api

# Start service
sudo systemctl start password-manager-api
```

## Updating Backend

### Automated Update

```bash
cd backend
./update-service.sh
```

### Manual Update

1. Make code changes
2. Package and copy to VM
3. Restart service

See `VM_DEPLOYMENT_GUIDE.md` for details.

## Mobile App Configuration

The mobile app is already configured to use:
- API URL: `http://192.168.2.234:8000`
- No additional configuration needed

The API service in `src/services/api.ts` is set to use the VM IP.

## Testing

### Test Backend

```bash
# Health check
curl http://192.168.2.234:8000/health

# Login (example)
curl -X POST http://192.168.2.234:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Test Mobile App

1. Build and run the app
2. Try logging in
3. Test password CRUD operations
4. Verify security analysis works

## Troubleshooting

### Backend Not Accessible

1. Check service status on VM
2. Check firewall rules
3. Verify port 8000 is open
4. Check logs for errors

### Mobile App Can't Connect

1. Verify backend is running: `curl http://192.168.2.234:8000/health`
2. Check network connectivity
3. Verify API URL in `src/services/api.ts`
4. Check CORS configuration

### Database Issues

1. Verify MySQL is running on VM
2. Check database credentials in `.env`
3. Test database connection
4. Verify database exists

## Security Checklist

- [ ] Backend service is running
- [ ] Firewall is configured
- [ ] Strong JWT secret is set
- [ ] Strong encryption key is set
- [ ] DEBUG is False in production
- [ ] Database passwords are strong
- [ ] CORS is configured correctly
- [ ] Logs are being collected
- [ ] Service starts on boot

## Production Considerations

1. **HTTPS**: Consider setting up HTTPS with nginx reverse proxy
2. **Monitoring**: Set up monitoring and alerts
3. **Backups**: Configure database backups
4. **Updates**: Keep dependencies updated
5. **Logs**: Set up log rotation
6. **Security**: Regular security audits

## Support

For issues:
1. Check service logs on VM
2. Check service status
3. Verify configuration
4. Test database connection
5. Check firewall rules

See `VM_DEPLOYMENT_GUIDE.md` for detailed troubleshooting.

