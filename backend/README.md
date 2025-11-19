# Password Manager Backend API

Secure FastAPI backend for the Password Manager application.

## Security Features

This backend implements comprehensive security measures as documented in `README_SECURITY.md`.

### Key Security Features:
- ✅ Argon2 password hashing (winner of Password Hashing Competition)
- ✅ JWT token authentication with expiration
- ✅ Rate limiting on all endpoints
- ✅ CORS protection
- ✅ Security headers (HSTS, XSS Protection, etc.)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Input validation and sanitization
- ✅ Password strength analysis
- ✅ Compromised password detection
- ✅ Comprehensive error handling
- ✅ Security logging and audit trail

## Installation

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials and secrets
```

3. **Run the server:**
```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
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
- `GET /api/passwords/applications/list` - Get applications list
- `GET /api/passwords/applications/{name}` - Get passwords by application

### Groups
- `GET /api/groups` - Get user groups
- `GET /api/groups/{name}/members` - Get group members
- `POST /api/groups/share` - Share password with group
- `POST /api/groups/unshare` - Unshare password from group
- `GET /api/groups/shared/passwords` - Get shared passwords

### Security
- `GET /api/security/analysis` - Analyze passwords for security issues
- `GET /api/security/stats` - Get security statistics

### FAQs
- `GET /api/faqs` - Get all FAQs
- `GET /api/faqs/{id}` - Get specific FAQ

## Security Documentation

See `README_SECURITY.md` for detailed security documentation.

## Database

The backend uses MySQL database with the following tables:
- `users` - User accounts
- `passwords` - Stored passwords
- `group_members` - Group membership
- `questions` - Security questions
- `faqs` - Frequently asked questions
- `admins` - Admin accounts

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app
```

## Deployment

1. Set `DEBUG=False` in production
2. Use strong `JWT_SECRET_KEY` and `ENCRYPTION_KEY`
3. Configure proper CORS origins
4. Enable SSL/TLS
5. Use environment variables for all secrets
6. Regularly update dependencies
7. Monitor security logs

## License

MIT License





