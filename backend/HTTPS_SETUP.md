# HTTPS Setup Guide

## Overview

The Password Manager API now supports HTTPS/SSL encryption for secure data transmission. All sensitive data (passwords, usernames, security answers) are encrypted in transit using TLS/SSL.

## Security Benefits

✅ **Encrypted Data Transmission**: All API responses are encrypted over HTTPS  
✅ **Protection Against Man-in-the-Middle Attacks**: SSL/TLS prevents interception  
✅ **Data Integrity**: Ensures data hasn't been tampered with during transmission  
✅ **Authentication**: Verifies server identity (with proper certificates)

## Quick Start

### 1. Generate Self-Signed Certificate (Development)

For development and testing, you can generate a self-signed certificate:

```bash
cd backend
python generate_cert.py
```

This will create:
- `certs/server.crt` - SSL certificate
- `certs/server.key` - Private key

**Note**: Self-signed certificates will show a browser security warning. This is normal for development.

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# HTTPS Configuration
USE_HTTPS=True
SSL_CERTFILE=certs/server.crt
SSL_KEYFILE=certs/server.key
```

### 3. Start the Server

```bash
# Linux/macOS
./start.sh

# Windows
start.bat
```

The server will automatically:
- Check for SSL certificates
- Generate them if missing (development mode)
- Start with HTTPS enabled

## Production Setup

### Option 1: Let's Encrypt (Recommended - Free)

1. **Install Certbot**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install certbot
   
   # macOS
   brew install certbot
   ```

2. **Generate Certificate**:
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com
   ```

3. **Update .env**:
   ```env
   USE_HTTPS=True
   SSL_CERTFILE=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   SSL_KEYFILE=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   ```

4. **Auto-renewal** (add to crontab):
   ```bash
   0 0 * * * certbot renew --quiet
   ```

### Option 2: Commercial SSL Certificate

1. Purchase SSL certificate from a trusted CA (DigiCert, GlobalSign, etc.)
2. Install certificate files
3. Update `.env` with certificate paths:
   ```env
   USE_HTTPS=True
   SSL_CERTFILE=/path/to/your/certificate.crt
   SSL_KEYFILE=/path/to/your/private.key
   ```

### Option 3: Reverse Proxy (Nginx/Apache)

For production, it's recommended to use a reverse proxy:

**Nginx Configuration Example**:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then set `USE_HTTPS=False` in `.env` (Nginx handles HTTPS).

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_HTTPS` | `True` | Enable/disable HTTPS |
| `SSL_CERTFILE` | `certs/server.crt` | Path to SSL certificate file |
| `SSL_KEYFILE` | `certs/server.key` | Path to SSL private key file |
| `SSL_CA_CERTS` | (optional) | Path to CA certificate bundle (for client cert verification) |

### Disable HTTPS (Development Only)

If you need to disable HTTPS for testing:

```env
USE_HTTPS=False
```

**Warning**: Only disable HTTPS in development. Never disable in production!

## Certificate File Permissions

For security, ensure proper file permissions:

```bash
# Private key - owner read/write only
chmod 600 certs/server.key

# Certificate - readable by all
chmod 644 certs/server.crt
```

## Troubleshooting

### Certificate Not Found

**Error**: `HTTPS enabled but certificate files not found`

**Solution**:
```bash
python generate_cert.py
```

### Browser Security Warning

**Issue**: Browser shows "Your connection is not private"

**Solution**: This is normal for self-signed certificates. Click "Advanced" → "Proceed to site" (development only).

For production, use certificates from a trusted CA (Let's Encrypt, etc.).

### OpenSSL Not Found

**Error**: `OpenSSL not found`

**Solution**:
- **Windows**: Download from https://slproweb.com/products/Win32OpenSSL.html
- **macOS**: `brew install openssl`
- **Linux**: `sudo apt-get install openssl` (or equivalent)

### Port Already in Use

**Error**: `Address already in use`

**Solution**: Change port in `.env`:
```env
PORT=8443
```

## Security Best Practices

1. ✅ **Always use HTTPS in production**
2. ✅ **Use certificates from trusted CAs** (Let's Encrypt, etc.)
3. ✅ **Keep private keys secure** (600 permissions)
4. ✅ **Renew certificates before expiration**
5. ✅ **Use strong cipher suites** (handled by uvicorn)
6. ✅ **Enable HSTS** (via reverse proxy or middleware)
7. ✅ **Regular security updates**

## Testing HTTPS

### Using curl:
```bash
# Skip certificate verification (self-signed)
curl -k https://localhost:8000/health

# With certificate verification
curl --cacert certs/server.crt https://localhost:8000/health
```

### Using Python:
```python
import requests

# Skip verification for self-signed
response = requests.get('https://localhost:8000/health', verify=False)

# With verification
response = requests.get('https://localhost:8000/health', verify='certs/server.crt')
```

## Mobile App Configuration

When using HTTPS with a mobile app:

1. **For self-signed certificates**: Configure the app to accept the certificate
2. **For production**: Use certificates from trusted CAs (automatically trusted)
3. **Update API base URL**: Change from `http://` to `https://`

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/) - Test your SSL configuration
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

