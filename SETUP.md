# 🔧 Ilom WhatsApp Bot - Complete Setup Guide

This comprehensive guide will help you set up your WhatsApp bot in minutes.

## 📋 Prerequisites

- Replit account (free tier works)
- WhatsApp account for the bot
- Optional: MongoDB Atlas account for production database

## 🚀 Step-by-Step Setup

### Step 1: Import to Replit

1. Click "Import from GitHub" in Replit
2. Paste this repository URL
3. Wait for import to complete
4. Repository will be ready in your workspace

### Step 2: Configure Secrets

In Replit, go to the Secrets tab and add:

#### Required Secrets
```
SESSION_ID = your_session_id_here
OWNER_NUMBERS = your_whatsapp_number_with_country_code
```

#### Optional Secrets (for enhanced features)
```
MONGODB_URL = mongodb+srv://user:pass@cluster.mongodb.net/botdb
OPENAI_API_KEY = your_openai_api_key
BOT_NAME = Your Custom Bot Name
```

### Step 3: Get SESSION_ID

#### Method A: From Existing Bot
If you have another WhatsApp bot:
1. Go to bot's session folder
2. Copy `creds.json` content
3. Base64 encode the JSON
4. Use encoded string as SESSION_ID

#### Method B: Generate New Session
1. Leave SESSION_ID empty initially
2. Run the bot
3. Scan QR code with target WhatsApp
4. Bot will generate and save session automatically

### Step 4: Database Setup (Optional)

#### For Production (Recommended)
1. Create MongoDB Atlas account
2. Create new cluster (free tier available)
3. Get connection string
4. Add as MONGODB_URL in secrets

#### For Development
No database setup needed - bot uses simulation mode.

### Step 5: Launch Bot

1. Click the "Run" button in Replit
2. Wait for initialization (30-60 seconds)
3. Look for "Bot is online and ready to serve!" message
4. Bot should connect automatically with SESSION_ID

## 🔍 Verification Steps

### Check Bot Status
Send these messages to verify functionality:
- `.ping` - Should respond with performance stats
- `.info` - Should show bot information
- `.help` - Should display command list

### Verify Features
- `.8ball Am I awesome?` - Test fun commands
- `.ai Hello` - Test AI integration
- `.sticker` - Reply to image to test media processing

## ⚙️ Advanced Configuration

### Environment Variables Reference

#### Core Settings
```env
NODE_ENV=development              # or production
PORT=5000                        # Server port (required for Replit)
HOST=0.0.0.0                     # Server host (required for Replit)
```

#### Bot Configuration
```env
BOT_NAME=Ilom Bot                # Custom bot name
PREFIX=.                         # Command prefix
PUBLIC_MODE=true                 # Allow public usage
MARK_ONLINE=true                 # Show online status
```

#### Database Settings
```env
MONGODB_URL=mongodb://...        # Primary MongoDB connection
DATABASE_ENABLED=true            # Enable/disable database
SKIP_DATABASE=false              # Force skip database
DB_MAX_POOL_SIZE=10             # Connection pool size
DB_TIMEOUT=5000                  # Connection timeout (ms)
```

#### Security Settings
```env
ENCRYPTION_KEY=your_secure_key   # For encrypting sensitive data
JWT_SECRET=your_jwt_secret       # For API authentication
SESSION_SECRET=your_session_key  # For session management
```

#### Feature Toggles
```env
ANTI_SPAM_ENABLED=true          # Enable anti-spam protection
WELCOME_ENABLED=false           # Auto-welcome new members
AUTO_REPLY_ENABLED=false        # Automatic replies
ECONOMY_ENABLED=true            # Virtual economy system
GAMES_ENABLED=true              # Game commands
```

#### AI Integration
```env
OPENAI_API_KEY=sk-...           # OpenAI GPT access
OPENAI_MODEL=gpt-3.5-turbo      # Model selection
OPENAI_MAX_TOKENS=150           # Response length limit
GEMINI_API_KEY=...              # Google Gemini access
```

#### Performance Tuning
```env
MAX_CONCURRENT_COMMANDS=50       # Concurrent command limit
COMMAND_COOLDOWN=3              # Command cooldown (seconds)
RATE_LIMIT_REQUESTS=20          # Rate limit per window
RATE_LIMIT_WINDOW=60000         # Rate limit window (ms)
MEMORY_THRESHOLD=0.8            # Memory usage alert threshold
```

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Bot Not Connecting to WhatsApp

**Symptoms**: QR codes keep appearing, connection timeouts
**Solutions**:
- Verify SESSION_ID is correctly formatted
- Check WhatsApp account isn't logged in elsewhere
- Try regenerating session with QR method

#### 2. Commands Not Responding

**Symptoms**: Bot online but doesn't respond to commands
**Solutions**:
- Check command prefix (default is `.`)
- Verify bot has message permissions
- Check logs for error messages

#### 3. Database Connection Errors

**Symptoms**: Database connection warnings in logs
**Solutions**:
- Verify MONGODB_URL format
- Check database credentials
- Set `SKIP_DATABASE=true` for development

#### 4. Permission Denied Errors

**Symptoms**: "Permission denied" messages
**Solutions**:
- Add your number to OWNER_NUMBERS
- Check group admin permissions
- Verify bot has necessary group permissions

#### 5. High Memory Usage

**Symptoms**: Bot crashes, memory warnings
**Solutions**:
- Enable Redis caching
- Adjust MEMORY_THRESHOLD
- Restart bot periodically

### Debug Mode

Enable detailed logging:
```env
LOG_LEVEL=debug
VERBOSE=true
```

View logs in Replit console for detailed troubleshooting.

## 🔧 Maintenance

### Regular Tasks

#### Weekly
- Check bot performance metrics
- Review error logs
- Update dependencies if needed

#### Monthly  
- Backup session data
- Review and update security settings
- Check for feature updates

#### As Needed
- Regenerate SESSION_ID if connection issues
- Update API keys when they expire
- Adjust rate limits based on usage

### Monitoring

#### Key Metrics to Monitor
- Response time (should be <200ms)
- Memory usage (should be <100MB)
- Database connection status
- Command success rate

#### Alert Thresholds
- Memory usage >80%
- Response time >500ms
- Error rate >5%
- Database downtime >30 seconds

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] All secrets configured
- [ ] Production database set up
- [ ] SESSION_ID working correctly
- [ ] All commands tested
- [ ] Performance metrics acceptable
- [ ] Security settings reviewed

### Production Settings
```env
NODE_ENV=production
DATABASE_ENABLED=true
MONGODB_URL=mongodb+srv://...
LOG_LEVEL=info
BACKUP_ENABLED=true
```

### Security Hardening
```env
ENCRYPTION_KEY=complex_random_key_here
JWT_SECRET=secure_jwt_secret_here
SESSION_SECRET=unique_session_secret
RATE_LIMIT_ENABLED=true
```

## 📞 Getting Help

### Self-Help Resources
1. Check this setup guide
2. Review troubleshooting section
3. Check Replit console logs
4. Test with `.ping` and `.status` commands

### Community Support
- GitHub Issues for bug reports
- Feature requests welcome
- Join our community discussions

### Professional Support
- Email: contact@ilom.tech
- Custom bot development
- Enterprise deployment assistance
- Priority bug fixes

---

**🎉 Congratulations! Your Ilom WhatsApp Bot should now be running perfectly!**

*Need help? Don't hesitate to reach out - we're here to make your bot legendary!*