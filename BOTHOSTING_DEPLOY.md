# 🚀 Bothosting.net Deployment Guide

## Complete Guide for Deploying Amazing Bot to Bothosting.net

---

## 📋 Prerequisites

Before deploying to Bothosting.net, ensure you have:

1. ✅ A Bothosting.net account
2. ✅ Your bot files ready (this repository)
3. ✅ WhatsApp phone number for bot authentication
4. ✅ MongoDB database URL (if using database features)

---

## 🎯 Step-by-Step Deployment

### 1. Prepare Your Files

Create a `.zip` file of your project:
```bash
zip -r amazing-bot.zip . -x "node_modules/*" ".git/*" "cache/*" "logs/*" "temp/*"
```

### 2. Upload to Bothosting.net

1. Log in to your Bothosting.net dashboard
2. Create a new server (Node.js type)
3. Upload the `amazing-bot.zip` file
4. Extract the archive in the file manager

### 3. Configure Environment Variables

In Bothosting.net dashboard, set these environment variables:

**Required:**
```
PORT=5000
NODE_ENV=production
BOT_NAME=Amazing Bot
PREFIX=.
PUBLIC_MODE=true
```

**Owner Configuration:**
```
OWNER_NUMBERS=234XXXXXXXXXX,234XXXXXXXXXX
```
*(Replace with your WhatsApp number in international format without +)*

**Session (Optional - leave empty for first run):**
```
SESSION_ID=
```
*(Will be generated after QR code scan)*

**Database (Optional):**
```
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname
```

### 4. Install Dependencies

In the Bothosting.net terminal or startup tab:
```bash
npm install
```

The bot will automatically install all dependencies from `package.json`.

### 5. First Run - Generate Session

**Start Command:**
```bash
npm start
```

**What happens:**
1. ✅ Bot starts and shows QR code in logs
2. 📱 Open WhatsApp on your phone
3. 🔗 Go to: **Linked Devices** > **Link a Device**
4. 📷 Scan the QR code from the logs
5. ✅ Bot connects successfully

**Get the QR Code:**
- Check the console logs in Bothosting.net
- Or access: `http://your-bot-url:5000/qr`

### 6. Save Your Session

After successful connection:

1. The bot generates session credentials
2. In the console logs, you'll see session information
3. Save the `SESSION_ID` value to your environment variables
4. This prevents needing to scan QR code on every restart

**How to get SESSION_ID:**
```bash
# Check cache/auth_info_baileys/creds.json
# Encode it to base64 and save as SESSION_ID
```

---

## ⚙️ Configuration Options

### Bot Settings (.env or Environment Variables)

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Bot Identity
BOT_NAME=Amazing Bot
PREFIX=.
BOT_VERSION=1.0.0

# Access Control
PUBLIC_MODE=true
OWNER_NUMBERS=234XXXXXXXXXX

# Session Management
SESSION_ID=Ilom~base64encodedstring...

# Database (Optional)
MONGODB_URL=mongodb+srv://...

# Features (Optional)
WEATHER_API_KEY=your_api_key
OPENAI_API_KEY=your_api_key
```

---

## 🔧 Troubleshooting

### Issue 1: "throw err" Error

**Problem:** Bot crashes with generic error

**Solution:**
```bash
# Check logs for specific error
# Common causes:
# 1. Missing environment variables
# 2. Invalid SESSION_ID
# 3. MongoDB connection issues
```

**Fix:**
- Delete `SESSION_ID` environment variable
- Restart bot to generate new QR code
- Re-scan with WhatsApp

### Issue 2: Connection Closed (401)

**Problem:** Device logged out error

**Solution:**
The bot now handles this automatically:
1. ✅ Clears invalid session
2. ✅ Generates new QR code
3. ✅ Waits for new scan
4. ✅ No manual restart needed!

**Manual Fix (if needed):**
```bash
# Delete session files
rm -rf cache/auth_info_baileys/*

# Restart bot
npm start
```

### Issue 3: Bot Keeps Restarting

**Problem:** Bot restarts in loop

**Solution:**
```bash
# Check if you have valid SESSION_ID
# If session is old/invalid, remove it
# Let bot generate fresh QR code
```

### Issue 4: QR Code Not Showing

**Problem:** Can't see QR code in logs

**Solution:**
1. Check logs output in Bothosting.net console
2. Access web QR: `http://your-bot-url:5000/qr`
3. Enable `printQRInTerminal: true` in config

### Issue 5: Database Connection Failed

**Problem:** MongoDB connection error

**Solution:**
```env
# Update MONGODB_URL format:
mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority

# Or disable database in development:
NODE_ENV=development
```

---

## 📊 Post-Deployment Checklist

After successful deployment:

- [ ] ✅ Bot shows as "online" in logs
- [ ] ✅ Web server running on port 5000
- [ ] ✅ QR code scanned and connected
- [ ] ✅ Test command: `.ping`
- [ ] ✅ Test command: `.help`
- [ ] ✅ Bot responds to messages
- [ ] ✅ Owner numbers configured
- [ ] ✅ Database connected (if using)
- [ ] ✅ SESSION_ID saved to environment

---

## 🎯 Startup Commands

**For Bothosting.net Startup Tab:**

**Production (Recommended):**
```bash
npm start
```

**Development:**
```bash
npm run dev
```

**With Logs:**
```bash
npm run debug
```

---

## 🔄 Updating Your Bot

To update bot code after changes:

1. Upload new files via SFTP or web interface
2. Restart the server in Bothosting.net
3. Bot will reload with new changes
4. No need to re-scan QR if SESSION_ID is saved

---

## 🆘 Support

If you encounter issues:

1. **Check Logs:** Review Bothosting.net console logs
2. **Verify Environment:** Ensure all required variables are set
3. **Test Locally:** Run bot locally first to ensure code works
4. **Session Reset:** Delete SESSION_ID and generate fresh QR
5. **Contact Support:** Reach out to Bothosting.net support

---

## 📝 Important Notes

**Session Management:**
- 🔒 SESSION_ID is sensitive - keep it secure
- 🔄 Session expires if unused for long periods
- 📱 Only one device can be linked at a time
- ♻️ Regenerate session if connection issues persist

**Resource Usage:**
- 💾 Bot uses minimal RAM (~200MB)
- 📊 CPU usage depends on command activity
- 🌐 Network usage varies with message volume
- 💿 Disk space: ~500MB including dependencies

**Best Practices:**
- ✅ Save SESSION_ID after first successful connection
- ✅ Use environment variables for all secrets
- ✅ Monitor logs regularly for errors
- ✅ Keep dependencies updated
- ✅ Use production mode for stability

---

## 🌟 Features Enabled

After deployment, these features will work:

✅ **WhatsApp Integration**
- Multi-device support
- Auto-reconnection
- QR code authentication
- Session persistence

✅ **Command System**
- 150+ commands
- 10 categories
- Custom prefix
- Permission system

✅ **Advanced Features**
- AI integration (if API keys provided)
- Media processing
- Canvas graphics
- Economy system
- Games and fun commands

✅ **Web Dashboard**
- QR code viewer: `/qr`
- Health check: `/api/health`
- Stats endpoint: `/api/stats`
- Swagger docs: `/api-docs`

---

<div align="center">

**🎉 Deployment Complete! 🎉**

Your Amazing Bot is now live on Bothosting.net!

**Created with ❤️ by Ilom**

[Back to Main README](./README.md)

</div>
