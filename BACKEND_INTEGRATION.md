# Backend Integration Guide

## Overview

This document describes the complete FastAPI backend integration for the Password Manager application. The backend is security-focused and implements comprehensive security measures.

## Quick Start

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Edit `backend/.env` with your database credentials:

```env
DB_HOST=192.168.2.234
DB_USER=uss-lousser
DB_PASSWORD=l4o8u5d1
DB_NAME=uss_database
DB_PORT=3306
JWT_SECRET_KEY=your-super-secret-key-change-this
```

### 3. Start Backend Server

```bash
# Using startup script
./start.sh  # macOS/Linux
start.bat   # Windows

# Or manually
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Verify Backend

- Health check: `http://192.168.2.234:8000/health`
- API docs: `http://192.168.2.234:8000/docs` (if DEBUG=True)

## Frontend Integration

### API Service

The frontend uses `src/services/api.ts` for all backend communication. The API base URL is configured as:

```typescript
const API_BASE_URL = __DEV__
  ? "http://192.168.2.234:8000"
  : "http://192.168.2.234:8000";
```

### Authentication Flow

1. **Login**: User logs in with username and password
2. **Token Storage**: JWT token is stored in memory (should use secure storage in production)
3. **API Requests**: All authenticated requests include the token in the Authorization header

### Updated Screens

All screens have been updated to use the backend API:

- ✅ **Login Screen**: Authenticates with backend
- ✅ **Signup Screen**: Creates new user account
- ✅ **Forgot Password**: Verifies security question
- ✅ **Reset Password**: Resets password via backend
- ✅ **Home Screen**: Loads recent passwords and message count
- ✅ **Vault Screen**: Loads passwords from backend
- ✅ **Password Details**: CRUD operations for passwords
- ✅ **Security Screen**: Password analysis from backend
- ✅ **Groups Screen**: Group management via backend
- ✅ **Messages Screen**: Trusted user requests and group invitations
- ✅ **FAQs Screen**: Loads FAQs from backend
- ✅ **Add Password**: Creates new password entries

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

### Backend Security

1. **Password Hashing**: Argon2 (winner of Password Hashing Competition)
2. **JWT Authentication**: Secure token-based authentication
3. **Rate Limiting**: Protection against brute-force attacks
4. **CORS Protection**: Configurable CORS policies
5. **Security Headers**: HSTS, XSS Protection, etc.
6. **Input Validation**: Pydantic schemas for all inputs
7. **SQL Injection Prevention**: Parameterized queries
8. **Password Strength Analysis**: Real-time strength calculation
9. **Compromised Password Detection**: Breach detection (simulated)
10. **Audit Logging**: Security event logging

### Frontend Security

1. **Token Management**: Secure token storage (should use Keychain/Keystore)
2. **Input Validation**: Client-side validation
3. **Error Handling**: Secure error messages
4. **API Security**: All requests use HTTPS in production

## Testing

### Backend Testing

```bash
# Run tests
pytest

# Test specific endpoint
curl -X POST http://192.168.2.234:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Frontend Testing

1. Start the backend server
2. Start the React Native app
3. Test login flow
4. Test password CRUD operations
5. Test security analysis

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify MySQL is running
   - Check database credentials in `.env`
   - Verify network connectivity

2. **CORS Errors**
   - Add frontend URL to `CORS_ORIGINS` in `.env`
   - Check backend CORS configuration

3. **Authentication Failed**
   - Verify JWT_SECRET_KEY is set
   - Check token expiration
   - Verify user exists in database

4. **API Errors**
   - Check backend logs
   - Verify API endpoint URLs
   - Check request/response formats

## Production Deployment

### Backend

1. Set `DEBUG=False` in `.env`
2. Use strong `JWT_SECRET_KEY`
3. Enable HTTPS/TLS
4. Configure proper CORS origins
5. Use environment variables for secrets
6. Enable database SSL connections
7. Set up monitoring and logging
8. Regular security audits

### Frontend

1. Update API_BASE_URL for production
2. Implement secure token storage (Keychain/Keystore)
3. Enable HTTPS only
4. Add error tracking (Sentry, etc.)
5. Implement offline support
6. Add analytics (optional)

## Security Checklist

- [x] Password hashing (Argon2)
- [x] JWT authentication
- [x] Rate limiting
- [x] CORS protection
- [x] Security headers
- [x] Input validation
- [x] SQL injection prevention
- [x] Password strength analysis
- [x] Compromised password detection
- [x] Audit logging
- [ ] Secure token storage (frontend)
- [ ] HTTPS/TLS (production)
- [ ] Database encryption
- [ ] Regular security audits

## Documentation

- **Security Documentation**: `backend/README_SECURITY.md`
- **Setup Guide**: `backend/SETUP_GUIDE.md`
- **API Documentation**: Available at `/docs` endpoint when DEBUG=True

## Support

For issues or questions, refer to:
- Security documentation: `backend/README_SECURITY.md`
- Setup guide: `backend/SETUP_GUIDE.md`
- API documentation: `http://192.168.2.234:8000/docs`

## Next Steps

1. Implement secure token storage in frontend
2. Add biometric authentication
3. Implement Have I Been Pwned API integration
4. Add database encryption
5. Set up production deployment
6. Implement monitoring and logging
7. Regular security audits

