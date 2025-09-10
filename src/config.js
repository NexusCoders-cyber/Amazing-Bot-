require('dotenv').config();

const config = {
    botName: process.env.BOT_NAME || 'Ilom Bot',
    botVersion: process.env.BOT_VERSION || '1.0.0',
    botDescription: process.env.BOT_DESCRIPTION || '🧠 Amazing Bot created by Ilom',
    botThumbnail: process.env.BOT_THUMBNAIL || 'https://i.ibb.co/2M7rtLk/ilom.jpg',
    botRepository: process.env.BOT_REPOSITORY || 'https://github.com/ilom-tech/whatsapp-bot',
    botWebsite: process.env.BOT_WEBSITE || 'https://ilom.tech',

    prefix: process.env.PREFIX || '.',
    secondaryPrefix: process.env.SECONDARY_PREFIX || '!',
    noPrefixEnabled: process.env.NO_PREFIX_ENABLED === 'true',
    privateNoPrefixEnabled: process.env.PRIVATE_NO_PREFIX_ENABLED === 'true',

    ownerNumbers: (process.env.OWNER_NUMBERS || '254700143167').split(',').map(num => 
        num.includes('@') ? num : `${num.trim()}@s.whatsapp.net`
    ),
    ownerName: process.env.OWNER_NAME || 'Ilom',

    publicMode: process.env.PUBLIC_MODE === 'true',
    selfMode: process.env.SELF_MODE === 'true',
    markOnline: process.env.MARK_ONLINE !== 'false',
    readMessages: process.env.READ_MESSAGES === 'true',
    autoTyping: process.env.AUTO_TYPING === 'true',

    database: {
        url: (process.env.DATABASE_URL && process.env.DATABASE_URL.length > 20) ? process.env.DATABASE_URL : 'mongodb://localhost:27017/ilombot',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        }
    },

    redis: {
        enabled: process.env.REDIS_ENABLED === 'true',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        options: {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true
        }
    },

    server: {
        port: parseInt(process.env.PORT) || 5000,
        host: process.env.HOST || '0.0.0.0',
        cors: process.env.CORS_ENABLED === 'true',
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100
        }
    },

    session: {
        sessionId: process.env.SESSION_ID || null,
        sessionPath: process.env.SESSION_PATH || './session',
        qrTimeout: parseInt(process.env.QR_TIMEOUT) || 60000,
        maxQrRetries: parseInt(process.env.MAX_QR_RETRIES) || 3
    },

    features: {
        autoReply: process.env.AUTO_REPLY_ENABLED === 'true',
        chatBot: process.env.CHAT_BOT_ENABLED === 'true',
        antiSpam: process.env.ANTI_SPAM_ENABLED !== 'false',
        antiLink: process.env.ANTI_LINK_ENABLED === 'true',
        welcome: process.env.WELCOME_ENABLED === 'true',
        goodbye: process.env.GOODBYE_ENABLED === 'true',
        autoSticker: process.env.AUTO_STICKER_ENABLED === 'true',
        autoRead: process.env.AUTO_READ_ENABLED === 'true',
        antiDelete: process.env.ANTI_DELETE_ENABLED === 'true',
        backup: process.env.AUTO_BACKUP_ENABLED === 'true'
    },

    limits: {
        messageLength: parseInt(process.env.MAX_MESSAGE_LENGTH) || 4096,
        mediaSize: parseInt(process.env.MAX_MEDIA_SIZE) || 50 * 1024 * 1024,
        commandCooldown: parseInt(process.env.COMMAND_COOLDOWN) || 3,
        rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS) || 20,
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
        maxWarnings: parseInt(process.env.MAX_WARNINGS) || 3,
        tempBanDuration: parseInt(process.env.TEMP_BAN_DURATION) || 3600000
    },

    apis: {
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 150,
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
        },
        gemini: {
            apiKey: process.env.GEMINI_API_KEY,
            model: process.env.GEMINI_MODEL || 'gemini-pro'
        },
        weather: {
            apiKey: process.env.WEATHER_API_KEY,
            provider: process.env.WEATHER_PROVIDER || 'openweathermap'
        },
        news: {
            apiKey: process.env.NEWS_API_KEY,
            country: process.env.NEWS_COUNTRY || 'us',
            category: process.env.NEWS_CATEGORY || 'general'
        },
        translate: {
            apiKey: process.env.TRANSLATE_API_KEY,
            provider: process.env.TRANSLATE_PROVIDER || 'google'
        },
        youtube: {
            apiKey: process.env.YOUTUBE_API_KEY
        },
        spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET
        }
    },

    economy: {
        enabled: process.env.ECONOMY_ENABLED === 'true',
        startingBalance: parseInt(process.env.STARTING_BALANCE) || 1000,
        dailyAmount: parseInt(process.env.DAILY_AMOUNT) || 100,
        weeklyAmount: parseInt(process.env.WEEKLY_AMOUNT) || 500,
        workCooldown: parseInt(process.env.WORK_COOLDOWN) || 3600000,
        robCooldown: parseInt(process.env.ROB_COOLDOWN) || 7200000,
        currency: {
            name: process.env.CURRENCY_NAME || 'coins',
            symbol: process.env.CURRENCY_SYMBOL || '🪙'
        }
    },

    games: {
        enabled: process.env.GAMES_ENABLED === 'true',
        maxActiveGames: parseInt(process.env.MAX_ACTIVE_GAMES) || 10,
        gameTimeout: parseInt(process.env.GAME_TIMEOUT) || 300000,
        triviaCategories: (process.env.TRIVIA_CATEGORIES || 'general,science,history').split(',')
    },

    media: {
        stickers: {
            packName: process.env.STICKER_PACK_NAME || 'Ilom Bot',
            authorName: process.env.STICKER_AUTHOR_NAME || 'Created by Ilom'
        },
        download: {
            maxFileSize: parseInt(process.env.MAX_DOWNLOAD_SIZE) || 100 * 1024 * 1024,
            allowedFormats: (process.env.ALLOWED_FORMATS || 'mp4,mp3,jpg,png,gif').split(','),
            quality: process.env.DOWNLOAD_QUALITY || 'medium'
        },
        upload: {
            tempPath: process.env.TEMP_UPLOAD_PATH || './temp/uploads',
            maxSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 20 * 1024 * 1024
        }
    },

    security: {
        encryptionKey: process.env.ENCRYPTION_KEY || 'default-key-change-this',
        jwtSecret: process.env.JWT_SECRET || 'jwt-secret-change-this',
        sessionSecret: process.env.SESSION_SECRET || 'session-secret-change-this',
        allowedOrigins: (process.env.ALLOWED_ORIGINS || 'localhost').split(','),
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 900000
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 7,
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        format: process.env.LOG_FORMAT || 'json',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE !== 'false'
    },

    backup: {
        enabled: process.env.BACKUP_ENABLED === 'true',
        interval: parseInt(process.env.BACKUP_INTERVAL) || 86400000,
        maxBackups: parseInt(process.env.MAX_BACKUPS) || 7,
        includeMedia: process.env.BACKUP_INCLUDE_MEDIA === 'true',
        compression: process.env.BACKUP_COMPRESSION !== 'false'
    },

    notifications: {
        startup: process.env.STARTUP_NOTIFICATION !== 'false',
        shutdown: process.env.SHUTDOWN_NOTIFICATION === 'true',
        errors: process.env.ERROR_NOTIFICATION === 'true',
        updates: process.env.UPDATE_NOTIFICATION === 'true'
    },

    localization: {
        defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
        fallbackLanguage: process.env.FALLBACK_LANGUAGE || 'en',
        supportedLanguages: (process.env.SUPPORTED_LANGUAGES || 'en,es,fr,de,pt,ar,hi,zh,ja,ko').split(','),
        autoDetect: process.env.AUTO_DETECT_LANGUAGE === 'true'
    },

    timezone: process.env.TIMEZONE || 'UTC',
    dateFormat: process.env.DATE_FORMAT || 'YYYY-MM-DD HH:mm:ss',
    
    development: {
        debug: process.env.NODE_ENV === 'development',
        verbose: process.env.VERBOSE === 'true',
        hotReload: process.env.HOT_RELOAD === 'true',
        mockApis: process.env.MOCK_APIS === 'true'
    },

    performance: {
        cacheSize: parseInt(process.env.CACHE_SIZE) || 1000,
        cacheTTL: parseInt(process.env.CACHE_TTL) || 3600,
        maxConcurrentCommands: parseInt(process.env.MAX_CONCURRENT_COMMANDS) || 50,
        memoryThreshold: parseFloat(process.env.MEMORY_THRESHOLD) || 0.8,
        cpuThreshold: parseFloat(process.env.CPU_THRESHOLD) || 0.8
    }
};

function validateConfig() {
    const errors = [];
    
    if (!config.ownerNumbers || config.ownerNumbers.length === 0) {
        errors.push('OWNER_NUMBERS is required');
    }
    
    if (config.database.url === 'mongodb://localhost:27017/ilombot') {
        console.warn('⚠️  Using default database URL. Consider setting DATABASE_URL for production.');
    }
    
    if (config.apis.openai.apiKey && !config.apis.openai.apiKey.startsWith('sk-')) {
        errors.push('Invalid OpenAI API key format');
    }
    
    if (config.security.encryptionKey === 'default-key-change-this') {
        console.warn('⚠️  Using default encryption key. Set ENCRYPTION_KEY for security.');
    }
    
    if (config.security.jwtSecret === 'jwt-secret-change-this') {
        console.warn('⚠️  Using default JWT secret. Set JWT_SECRET for security.');
    }
    
    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
    }
    
    console.log('✅ Configuration validated successfully');
}

function getEnvironmentInfo() {
    return {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'production',
        memory: process.memoryUsage(),
        uptime: process.uptime()
    };
}

function isDevelopment() {
    return process.env.NODE_ENV === 'development' || config.development.debug;
}

function isProduction() {
    return process.env.NODE_ENV === 'production';
}

validateConfig();

module.exports = {
    ...config,
    validateConfig,
    getEnvironmentInfo,
    isDevelopment,
    isProduction
};