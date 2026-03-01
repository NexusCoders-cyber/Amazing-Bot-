import 'dotenv/config';

function normalizePhoneNumber(phone) {
    if (!phone || phone.trim() === '') return null;
    let cleaned = phone.trim();
    cleaned = cleaned.replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast/g, '');
    cleaned = cleaned.split(':')[0];
    cleaned = cleaned.replace(/[^0-9]/g, '');
    if (cleaned.length < 10) return null;
    return `${cleaned}@s.whatsapp.net`;
}

const config = {
    botName: process.env.BOT_NAME || 'Ilom Bot',
    botVersion: process.env.BOT_VERSION || '1.0.0',
    botDescription: process.env.BOT_DESCRIPTION || 'Amazing Bot created by Ilom',
    botThumbnail: process.env.BOT_THUMBNAIL || 'https://files.catbox.moe/13uws5.jpg',
    botRepository: process.env.BOT_REPOSITORY || 'https://github.com/NexusCoders-cyber/Amazing-Bot-.git',
    botWebsite: process.env.BOT_WEBSITE || 'https://ilom.tech',

    prefix: process.env.PREFIX || '.',
    ownerNoPrefix: process.env.OWNER_NO_PREFIX === 'true',
    noPrefixEnabled: process.env.NO_PREFIX_ENABLED === 'true',
    privateNoPrefixEnabled: process.env.PRIVATE_NO_PREFIX_ENABLED === 'true',

    ownerNumbers: (process.env.OWNER_NUMBERS || '').split(',')
        .map(normalizePhoneNumber)
        .filter(Boolean),
    
    ownerName: process.env.OWNER_NAME || 'Ilom',
    
    sudoers: (process.env.SUDO_NUMBERS || '').split(',')
        .map(normalizePhoneNumber)
        .filter(Boolean),

    publicMode: process.env.PUBLIC_MODE === 'true',
    selfMode: process.env.SELF_MODE === 'true',
    autoOnline: process.env.AUTO_ONLINE !== 'false',
    autoRead: process.env.AUTO_READ === 'true',
    autoTyping: process.env.AUTO_TYPING === 'true',
    autoRecording: process.env.AUTO_RECORDING === 'true',
    
    whitelist: {
        enabled: process.env.WHITELIST_ENABLED === 'true',
        bypassOwners: true,
        bypassSudos: true,
        bypassBotOwner: true
    },

    database: {
        url: process.env.MONGODB_URL || process.env.DATABASE_URL || 'mongodb://localhost:27017/ilombot',
        enabled: process.env.DATABASE_ENABLED !== 'false',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
            serverSelectionTimeoutMS: parseInt(process.env.DB_TIMEOUT) || 5000,
            socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
            bufferMaxEntries: 0,
            bufferCommands: false,
            autoCreate: false,
            autoIndex: false
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
        maxQrRetries: parseInt(process.env.MAX_QR_RETRIES) || 3,
        qrScannerEnabled: process.env.QR_SCANNER_ENABLED === 'true'
    },

    features: {
        autoReply: process.env.AUTO_REPLY_ENABLED !== 'false',
        chatBot: process.env.CHAT_BOT_ENABLED === 'true',
        antiSpam: process.env.ANTI_SPAM_ENABLED !== 'false',
        antiLink: process.env.ANTI_LINK_ENABLED !== 'false',
        welcome: process.env.WELCOME_ENABLED !== 'false',
        goodbye: process.env.GOODBYE_ENABLED !== 'false',
        autoSticker: process.env.AUTO_STICKER_ENABLED === 'true',
        autoRead: process.env.AUTO_READ_ENABLED === 'true',
        antiDelete: process.env.ANTI_DELETE_ENABLED !== 'false',
        backup: process.env.AUTO_BACKUP_ENABLED === 'true'
    },

    events: {
        callAutoReject: process.env.EVENT_CALL_AUTO_REJECT !== 'false',
        groupJoin: process.env.EVENT_GROUP_JOIN !== 'false',
        groupLeave: process.env.EVENT_GROUP_LEAVE !== 'false',
        groupUpdate: process.env.EVENT_GROUP_UPDATE !== 'false',
        groupPromote: process.env.EVENT_GROUP_PROMOTE !== 'false',
        groupDemote: process.env.EVENT_GROUP_DEMOTE !== 'false',
        messageReaction: process.env.EVENT_MESSAGE_REACTION !== 'false',
        autoReaction: process.env.EVENT_AUTO_REACTION === 'true',
        levelUp: process.env.EVENT_LEVEL_UP !== 'false',
        contactUpdate: process.env.EVENT_CONTACT_UPDATE === 'true',
        messageUpdate: process.env.EVENT_MESSAGE_UPDATE !== 'false',
        messageDelete: process.env.EVENT_MESSAGE_DELETE !== 'false'
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
        console.warn('⚠️  OWNER_NUMBERS is not set in .env file');
    } else {
        console.log(`✅ Loaded ${config.ownerNumbers.length} owner number(s)`);
        config.ownerNumbers.forEach((num, idx) => {
            console.log(`   Owner ${idx + 1}: ${num.split('@')[0]}`);
        });
    }
    
    if (config.sudoers && config.sudoers.length > 0) {
        console.log(`✅ Loaded ${config.sudoers.length} sudo user(s)`);
        config.sudoers.forEach((num, idx) => {
            console.log(`   Sudo ${idx + 1}: ${num.split('@')[0]}`);
        });
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
        console.error('Configuration errors:');
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

export default {
    ...config,
    validateConfig,
    getEnvironmentInfo,
    isDevelopment,
    isProduction
};