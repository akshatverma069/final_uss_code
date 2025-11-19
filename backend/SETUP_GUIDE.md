# Backend Setup Guide

## Prerequisites

1. **Python 3.8 or higher** installed on your system
2. **MySQL Server** running and accessible
3. **Database created** with the schema from your MySQL Workbench

## Installation Steps

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create Virtual Environment

```bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=8000
NODE_ENV=development
DEBUG=True

# Database Configuration
DB_HOST=192.168.2.234
DB_USER=uss-lousser
DB_PASSWORD=l4o8u5d1
DB_NAME=uss_database
DB_PORT=3306

# JWT Configuration - SECURITY: Change this in production!
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production-use-strong-random-key-min-32-characters

# Security: Password hashing
PASSWORD_HASH_ALGORITHM=argon2

# Security: Rate limiting
RATE_LIMIT_ENABLED=True

# Security: CORS - Add your frontend URLs
CORS_ORIGINS=["http://localhost:3000","http://localhost:8081","http://192.168.2.234:3000"]

# Security: Encryption key (generate a strong key in production)
ENCRYPTION_KEY=change-this-encryption-key-in-production
```

### 5. Database Setup

Ensure your MySQL database is set up with the following tables:
- `users`
- `passwords`
- `group_members`
- `questions`
- `faqs`
- `admins`

### 6. Run the Server

```bash
# Using the startup script (recommended)
./start.sh  # On macOS/Linux
start.bat   # On Windows

# Or manually
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 7. Verify Installation

1. Check health endpoint: `http://192.168.2.234:8000/health`
2. Access API documentation: `http://192.168.2.234:8000/docs` (if DEBUG=True)

## Security Configuration

### Production Deployment

1. **Set DEBUG=False** in `.env`
2. **Generate strong JWT_SECRET_KEY**:
   ```python
   import secrets
   print(secrets.token_urlsafe(32))
   ```
3. **Generate strong ENCRYPTION_KEY**:
   ```python
   import secrets
   print(secrets.token_urlsafe(32))
   ```
4. **Configure CORS** with only your production frontend URLs
5. **Enable SSL/TLS** for HTTPS
6. **Use environment variables** for all secrets (never commit to git)

## Testing the API

### Using curl

```bash
# Health check
curl http://192.168.2.234:8000/health

# Login
curl -X POST http://192.168.2.234:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"yourpassword"}'

# Get passwords (with token)
curl http://192.168.2.234:8000/api/passwords \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman

1. Import the API collection
2. Set base URL: `http://192.168.2.234:8000`
3. Login to get token
4. Use token in Authorization header for protected endpoints

## Troubleshooting

### Database Connection Issues

1. Verify MySQL is running
2. Check database credentials in `.env`
3. Verify network connectivity to database server
4. Check firewall rules

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill process or change PORT in .env
```

### Import Errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/questions` - Get security questions

### Passwords
- `POST /api/passwords` - Create password
- `GET /api/passwords` - Get all passwords
- `GET /api/passwords/{id}` - Get specific password
- `PUT /api/passwords/{id}` - Update password
- `DELETE /api/passwords/{id}` - Delete password
- `GET /api/passwords/recent` - Get recent passwords
- `GET /api/passwords/applications/list` - Get applications
- `GET /api/passwords/applications/{name}` - Get passwords by application

### Groups
- `GET /api/groups` - Get user groups
- `GET /api/groups/{name}/members` - Get group members
- `POST /api/groups/share` - Share password
- `POST /api/groups/unshare` - Unshare password
- `GET /api/groups/shared/passwords` - Get shared passwords

### Security
- `GET /api/security/analysis` - Analyze passwords
- `GET /api/security/stats` - Get security stats

### FAQs
- `GET /api/faqs` - Get all FAQs
- `GET /api/faqs/{id}` - Get specific FAQ

### Messages
- `GET /api/messages` - Get messages
- `POST /api/messages/trusted-user-request` - Create trusted user request
- `POST /api/messages/group-invitation` - Create group invitation
- `POST /api/messages/{id}/accept` - Accept message
- `POST /api/messages/{id}/reject` - Reject message
- `GET /api/messages/count` - Get message count

## Security Features

See `README_SECURITY.md` for comprehensive security documentation.

## Support

For issues or questions, please refer to the security documentation or contact the development team.





