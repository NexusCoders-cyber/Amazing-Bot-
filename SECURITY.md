# Security Guide

## ⚠️ CRITICAL SECURITY NOTICE

This project has been secured against several critical vulnerabilities that were present in the original codebase. Please read this document carefully before deployment.

## Fixed Security Issues

### 1. Session Credentials Exposure
- **Issue**: Session credentials (`session/creds.json`) were exposed in the repository
- **Fix**: Removed all session files and ensured `session/` directory is in `.gitignore`
- **Action Required**: Users must provide their own session credentials via environment variables

### 2. Hardcoded Phone Number
- **Issue**: Third-party phone number (2347075663318) was hardcoded in configuration
- **Fix**: Changed default `OWNER_NUMBERS` to placeholder "YOUR_PHONE_NUMBER"
- **Action Required**: Set your own phone number in `OWNER_NUMBERS` environment variable

### 3. API Router Mounting Issue
- **Issue**: Web server router validation prevented Express routers from mounting properly
- **Fix**: Updated validation logic to accept both functions and Express router objects
- **Benefit**: API routes will now mount correctly

## Required Environment Variables

Before running this bot, you MUST set these environment variables:

```bash
# Your WhatsApp phone number (required)
OWNER_NUMBERS=234XXXXXXXXXX

# Your session credentials (if you have them)
SESSION_ID=your_session_data_here

# Other recommended security settings
BOT_NAME=YourBotName
ENCRYPTION_KEY=your-strong-encryption-key-here
JWT_SECRET=your-jwt-secret-here
SESSION_SECRET=your-session-secret-here
```

## Security Best Practices

### 1. Session Management
- Never commit session files to version control
- Use environment variables for session data
- Regenerate sessions if compromised

### 2. Access Control
- Only add trusted phone numbers to `OWNER_NUMBERS`
- Use strong encryption keys
- Enable rate limiting in production

### 3. Environment Configuration
- Use different configurations for development/production
- Keep API keys in environment variables
- Never expose internal configurations publicly

## File Protections

The following files/directories are protected by `.gitignore`:

- `session/` - WhatsApp session data
- `*.session*` - Session files
- `logs/` - Application logs
- `temp/` - Temporary files
- `*.env*` - Environment files
- `*.key`, `*.cert`, `*.pem` - Security certificates

## What to do if you fork this project

1. **Set your own environment variables** - Never use the defaults
2. **Review all configurations** - Ensure no hardcoded credentials remain
3. **Test in development first** - Never deploy directly to production
4. **Monitor for security updates** - Keep dependencies updated

## Reporting Security Issues

If you find security vulnerabilities in this project:

1. **DO NOT** open a public issue
2. Contact the maintainers privately
3. Allow time for fixes before disclosure
4. Follow responsible disclosure practices

## Additional Security Measures

Consider implementing these additional security measures:

- Enable 2FA for all accounts
- Use a VPN for production deployment
- Monitor logs for suspicious activity
- Implement backup and recovery procedures
- Use secure hosting with regular updates

---

**Remember**: Security is an ongoing process, not a one-time setup. Regularly review and update your security measures.