<div align="center">

# 🌈 ✨ ASTA BOT ✨ 🌈

<div style="text-align: center; margin: 20px 0;">
  <h2 style="
    font-size: 4em;
    font-weight: bold;
    background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 20px rgba(255,0,255,0.8), 0 0 40px rgba(0,255,255,0.6);
    animation: glow 2s ease-in-out infinite;
  ">
    💫 Made by <span style="
      animation: pulse 1.5s ease-in-out infinite;
      filter: drop-shadow(0 0 10px rgba(255,0,255,1)) drop-shadow(0 0 20px rgba(0,255,255,0.8));
    ">Ilom</span> 💫
  </h2>
</div>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=32&duration=2800&pause=2000&color=FF00F7&center=true&vCenter=true&width=940&lines=Welcome+to+Amazing+Bot!;The+Most+Advanced+WhatsApp+Bot;Created+with+Love+by+Ilom" alt="Typing SVG" />

<style>
@keyframes glow {
  0%, 100% { filter: brightness(1) drop-shadow(0 0 20px rgba(255,0,255,0.8)); }
  50% { filter: brightness(1.5) drop-shadow(0 0 40px rgba(0,255,255,1)); }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
}
</style>

[![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://www.whatsapp.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![AI Powered](https://img.shields.io/badge/AI-Powered-FF6B6B?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

</div>

---

## 🎨 **Overview**

**Asta Bot** is a comprehensive Node.js WhatsApp automation platform built with cutting-edge technology. Featuring AI integration, media processing, economy systems, admin tools, and extensive command management designed for maximum performance and flexibility.

### ⚡ **Latest Updates (Oct 2025)**
- ✅ **Node.js 20+** - Maximum performance and latest features
- ✅ **Baileys 7.0.0** - Advanced WhatsApp connectivity
- ✅ **Enhanced Session Management** - Multi-platform cloud support
- ✅ **150+ Commands** - Comprehensive bot functionality
- ✅ **Advanced Error Handling** - Production-ready stability
- ✅ **Auto-Deployment** - Replit, Railway, Heroku, Render support

---

## 👤 **User Preferences**

💬 **Communication Style:** Simple, everyday language for everyone to understand

---

## 🏗️ **System Architecture**

### 🔌 **Core Framework**
- 📱 **WhatsApp Integration** - Baileys v7.0.0-rc.3 for seamless WhatsApp Web API
- ⚙️ **Node.js Runtime** - v20+ with modern ES6+ features and async/await
- 🌐 **Express Web Server** - RESTful API and management dashboard on port 5000
- 🔧 **Modular Plugin System** - Hot-reloadable extensible architecture
- ☁️ **Multi-Cloud Support** - Replit, Railway, Heroku, Render, Vercel, Netlify, Koyeb

### 🎯 **Command System**
- 📁 **Organized Categories** - admin, ai, downloader, economy, fun, games, general, media, owner, utility
- 🔄 **Dynamic Loading** - Automatic command discovery and registration
- 🔐 **Permission System** - owner, admin, premium, user, banned access levels
- 🏷️ **Alias Support** - Multiple command names and shortcuts
- 🛡️ **Rate Limiting** - Anti-spam and abuse prevention

### 💾 **Data Management**
- 🗄️ **MongoDB** - Primary database with Mongoose ODM
- ⚡ **Redis Caching** - High-performance optional caching layer
- 🔑 **Session Management** - Persistent WhatsApp authentication
- 📂 **File Storage** - Local filesystem for media and temp files

### 🤖 **AI and External Services**
- 🧠 **Multi-AI Support** - OpenAI GPT and Google Gemini integration
- 🎬 **Media Processing** - FFmpeg audio/video, Canvas image processing
- 📥 **Download Services** - YouTube, Instagram, TikTok, Facebook, Twitter support
- 🌍 **Translation** - Google Translate and DeepL integration
- 🌤️ **Information Services** - Weather, news, and real-time data APIs

### 🔒 **Security and Performance**
- 🚫 **Anti-Spam** - Message frequency and pattern detection
- ⏱️ **Rate Limiting** - Request throttling per user and command
- ✅ **Input Validation** - Comprehensive user input validation
- 🎯 **Error Handling** - Centralized error management with logging
- 💪 **Memory Management** - Garbage collection and resource monitoring

### 📨 **Messaging and Events**
- 📬 **Message Queue** - Async processing with priority support
- 🎪 **Event-Driven** - Message, call, and group update handlers
- 🤖 **Auto-Reply** - Configurable automated responses
- 👥 **Group Management** - Admin tools and moderation features

### 🚀 **Deployment and Monitoring**
- ⚙️ **PM2 Process Manager** - Production auto-restart and clustering
- 🐳 **Docker Support** - Containerized deployment options
- 📝 **Logging System** - Winston multi-level logging with rotation
- 💾 **Backup System** - Automated database and session backups
- 🏥 **Health Monitoring** - System status and performance metrics

---

## 📦 **External Dependencies**

### 📱 **Core WhatsApp Integration**
- `@whiskeysockets/baileys` - WhatsApp Web API library
- `qrcode` - QR code generation for authentication
- `qrcode-terminal` - Terminal QR code display

### 🗄️ **Database and Caching**
- `mongoose` - MongoDB object modeling
- `redis` - High-performance caching
- `node-cache` - In-memory caching fallback

### 🧠 **AI and Machine Learning**
- `@google/generative-ai` - Google Gemini AI
- `openai` - OpenAI GPT API client
- `natural` - Natural language processing
- `tesseract.js` - OCR text recognition

### 🎨 **Media Processing**
- `ffmpeg` - Audio/video processing (system dependency)
- `fluent-ffmpeg` - FFmpeg Node.js wrapper
- `@napi-rs/canvas` - Image manipulation
- `sharp` - High-performance image processing
- `jimp` - JavaScript image processing
- `wa-sticker-formatter` - WhatsApp sticker creation

### 🌐 **Web Framework**
- `express` - Web server and REST API
- `cors` - Cross-origin resource sharing
- `helmet` - Security headers
- `compression` - Response compression
- `express-rate-limit` - Request rate limiting
- `express-session` - Session management
- `multer` - File upload handling

### 📥 **Download Services**
- `ytdl-core` - YouTube downloads
- `axios` - HTTP client
- `cheerio` - HTML parsing
- `puppeteer` - Web scraping automation

### 🌍 **Translation and Localization**
- `translate-google-api` - Google Translate
- `i18n` - Internationalization support

### 🛠️ **Utility Libraries**
- `dotenv` - Environment variables
- `winston` - Advanced logging
- `chalk` - Terminal colors
- `figlet` - ASCII art generation
- `gradient-string` - Gradient text styling
- `fs-extra` - Enhanced file operations
- `node-cron` - Task scheduling
- `bcryptjs` - Password hashing
- `validator` - Input validation
- `moment-timezone` - Date/time handling

### 🔧 **Development and Testing**
- `nodemon` - Development auto-restart
- `pm2` - Production process management

---

<div align="center">

## 🌟 **Features Highlights** 🌟

| Feature | Description | Status |
|---------|-------------|--------|
| 🎯 **150+ Commands** | Comprehensive command library | ✅ Active |
| 🤖 **AI Integration** | OpenAI & Google Gemini | ✅ Active |
| 📥 **Media Downloads** | YouTube, Instagram, TikTok, etc. | ✅ Active |
| 🎮 **Games System** | Interactive games and fun | ✅ Active |
| 💰 **Economy System** | Virtual currency and shop | ✅ Active |
| 👥 **Group Admin Tools** | Complete moderation suite | ✅ Active |
| 🎨 **Canvas Graphics** | Image generation and editing | ✅ Active |
| 🌍 **Multi-Language** | 10+ language support | ✅ Active |
| 📊 **Analytics** | Usage statistics and insights | ✅ Active |
| 🔒 **Security** | Advanced protection systems | ✅ Active |

</div>

---

<div align="center">

<div style="text-align: center; padding: 20px;">
  <h2 style="
    font-size: 3em;
    background: linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff00ff);
    background-size: 300% 300%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: rainbow 4s ease infinite;
    text-shadow: 0 0 30px rgba(255,0,255,0.9);
    filter: drop-shadow(0 0 15px rgba(0,255,255,0.7));
  ">
    💖 Made with Love by <span style="
      font-weight: bold;
      animation: glow-pulse 2s ease-in-out infinite;
    ">✨ Ilom ✨</span> 💖
  </h2>
</div>

<style>
@keyframes rainbow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes glow-pulse {
  0%, 100% { 
    filter: drop-shadow(0 0 10px rgba(255,0,255,1)) drop-shadow(0 0 20px rgba(0,255,255,0.8));
    transform: scale(1);
  }
  50% { 
    filter: drop-shadow(0 0 20px rgba(255,0,255,1)) drop-shadow(0 0 40px rgba(0,255,255,1));
    transform: scale(1.02);
  }
}
</style>

### 🌈 **Asta Bot - The Future of WhatsApp Automation** 🌈

[![GitHub](https://img.shields.io/badge/GitHub-Ilom-181717?style=for-the-badge&logo=github)](https://github.com/NexusCoders-cyber)
[![Support](https://img.shields.io/badge/Support-Chat-25D366?style=for-the-badge&logo=whatsapp)](https://wa.me/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](./LICENSE)

---

**⭐ If you love this project, give it a star! ⭐**

**🚀 Built with cutting-edge technology and endless passion 🚀**

</div>
