# Quick Start Guide - VM Deployment

## One-Command Deployment

Deploy the backend to your VM with a single command:

```bash
cd backend
./deploy-vm.sh
```

This will:
1. ✅ Package your backend code
2. ✅ Copy it to the VM (192.168.2.234)
3. ✅ Set up Python virtual environment
4. ✅ Install all dependencies
5. ✅ Create systemd service
6. ✅ Start the service
7. ✅ Configure auto-start on boot

## Verify Deployment

After deployment, verify it's working:

```bash
# Check if API is responding
curl http://192.168.2.234:8000/health

# Should return: {"status":"healthy","database":"connected",...}
```

## Service Management

### Check Status
```bash
ssh uss-lousser@192.168.2.234
sudo systemctl status password-manager-api
```

### View Logs
```bash
sudo journalctl -u password-manager-api -f
```

### Restart Service
```bash
sudo systemctl restart password-manager-api
```

## Update Backend

After making code changes:

```bash
cd backend
./update-service.sh
```

## Mobile App

The mobile app is already configured to use `http://192.168.2.234:8000`.

Just build and run:
```bash
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

## Troubleshooting

### Service Not Starting
```bash
# Check logs
sudo journalctl -u password-manager-api -n 50

# Check service status
sudo systemctl status password-manager-api
```

### API Not Accessible
```bash
# Check if port is open
sudo netstat -tlnp | grep 8000

# Check firewall
sudo ufw status
```

### Database Issues
```bash
# Test database connection
mysql -u uss-lousser -p -h 192.168.2.234 uss_database
```

## Next Steps

1. ✅ Backend is running on VM
2. ✅ Service starts on boot
3. ✅ Mobile app connects to backend
4. ✅ Ready to use!

For detailed information, see:
- `VM_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `DEPLOYMENT.md` - General deployment information
- `backend/README_SECURITY.md` - Security documentation

