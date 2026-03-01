const BOT_VERSION = '1.0.0';
const BOT_NAME = 'Ilom Bot';
const BOT_AUTHOR = 'Ilom';
const BOT_DESCRIPTION = '🧠 Amazing Bot 🧠 v1 created by Ilom';

const MESSAGE_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    STICKER: 'sticker',
    CONTACT: 'contact',
    LOCATION: 'location',
    LIVE_LOCATION: 'liveLocation',
    POLL: 'poll',
    BUTTON_RESPONSE: 'buttonResponse',
    LIST_RESPONSE: 'listResponse'
};

const COMMAND_CATEGORIES = {
    ADMIN: 'admin',
    AI: 'ai',
    DOWNLOADER: 'downloader',
    ECONOMY: 'economy',
    FUN: 'fun',
    GAMES: 'games',
    GENERAL: 'general',
    MEDIA: 'media',
    OWNER: 'owner',
    UTILITY: 'utility'
};

const USER_PERMISSIONS = {
    OWNER: 'owner',
    ADMIN: 'admin',
    PREMIUM: 'premium',
    USER: 'user',
    BANNED: 'banned'
};

const GROUP_PERMISSIONS = {
    OWNER: 'superadmin',
    ADMIN: 'admin',
    MEMBER: 'member'
};

const COMMAND_PERMISSIONS = {
    OWNER: 'owner',
    ADMIN: 'admin',
    PREMIUM: 'premium',
    GROUP: 'group',
    PRIVATE: 'private',
    BOT_ADMIN: 'botAdmin'
};

const ERROR_CODES = {
    UNKNOWN_COMMAND: 'UNKNOWN_COMMAND',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    INVALID_ARGUMENTS: 'INVALID_ARGUMENTS',
    COOLDOWN_ACTIVE: 'COOLDOWN_ACTIVE',
    RATE_LIMITED: 'RATE_LIMITED',
    USER_BANNED: 'USER_BANNED',
    GROUP_BANNED: 'GROUP_BANNED',
    FEATURE_DISABLED: 'FEATURE_DISABLED',
    API_ERROR: 'API_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    MEDIA_ERROR: 'MEDIA_ERROR'
};

const STATUS_CODES = {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

const EVENT_TYPES = {
    MESSAGE_CREATE: 'messageCreate',
    MESSAGE_UPDATE: 'messageUpdate',
    MESSAGE_DELETE: 'messageDelete',
    GROUP_JOIN: 'groupJoin',
    GROUP_LEAVE: 'groupLeave',
    GROUP_UPDATE: 'groupUpdate',
    CALL_RECEIVED: 'callReceived',
    CONNECTION_UPDATE: 'connectionUpdate',
    READY: 'ready',
    ERROR: 'error'
};

const MIME_TYPES = {
    IMAGE: {
        JPEG: 'image/jpeg',
        PNG: 'image/png',
        GIF: 'image/gif',
        WEBP: 'image/webp'
    },
    VIDEO: {
        MP4: 'video/mp4',
        AVI: 'video/avi',
        MOV: 'video/mov',
        MKV: 'video/mkv'
    },
    AUDIO: {
        MP3: 'audio/mpeg',
        M4A: 'audio/mp4',
        OGG: 'audio/ogg',
        WAV: 'audio/wav'
    },
    DOCUMENT: {
        PDF: 'application/pdf',
        DOC: 'application/msword',
        DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        XLS: 'application/vnd.ms-excel',
        XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        PPT: 'application/vnd.ms-powerpoint',
        PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        TXT: 'text/plain',
        ZIP: 'application/zip',
        RAR: 'application/x-rar-compressed'
    }
};

const MEDIA_LIMITS = {
    IMAGE: {
        MAX_SIZE: 5 * 1024 * 1024,
        MAX_WIDTH: 4096,
        MAX_HEIGHT: 4096,
        ALLOWED_FORMATS: ['jpeg', 'jpg', 'png', 'gif', 'webp']
    },
    VIDEO: {
        MAX_SIZE: 50 * 1024 * 1024,
        MAX_DURATION: 300,
        ALLOWED_FORMATS: ['mp4', 'avi', 'mov', 'mkv', 'webm']
    },
    AUDIO: {
        MAX_SIZE: 10 * 1024 * 1024,
        MAX_DURATION: 600,
        ALLOWED_FORMATS: ['mp3', 'm4a', 'ogg', 'wav', 'aac']
    },
    DOCUMENT: {
        MAX_SIZE: 20 * 1024 * 1024,
        ALLOWED_FORMATS: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar']
    },
    STICKER: {
        MAX_SIZE: 1024 * 1024,
        DIMENSIONS: 512,
        FORMAT: 'webp'
    }
};

const RATE_LIMITS = {
    COMMANDS: {
        WINDOW: 60000,
        MAX_REQUESTS: 20
    },
    MESSAGES: {
        WINDOW: 60000,
        MAX_REQUESTS: 100
    },
    MEDIA: {
        WINDOW: 300000,
        MAX_REQUESTS: 10
    },
    API: {
        WINDOW: 3600000,
        MAX_REQUESTS: 1000
    }
};

const COOLDOWNS = {
    GLOBAL: 1000,
    COMMAND: 3000,
    MEDIA: 5000,
    DOWNLOAD: 10000,
    AI: 5000,
    GAME: 2000
};

const TIMEOUTS = {
    CONNECTION: 60000,
    COMMAND_EXECUTION: 30000,
    MEDIA_DOWNLOAD: 60000,
    API_REQUEST: 15000,
    DATABASE_QUERY: 10000,
    GAME_SESSION: 300000
};

const REGEX_PATTERNS = {
    URL: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[1-9]\d{1,14}$/,
    MENTION: /@(\d+)/g,
    HASHTAG: /#\w+/g,
    COMMAND: /^[.!/#>](\w+)/,
    IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    IPV6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
};

const API_ENDPOINTS = {
    OPENAI: 'https://api.openai.com/v1',
    GEMINI: 'https://generativelanguage.googleapis.com/v1beta',
    WEATHER: 'https://api.openweathermap.org/data/2.5',
    NEWS: 'https://newsapi.org/v2',
    YOUTUBE: 'https://www.googleapis.com/youtube/v3',
    TRANSLATE: 'https://api.mymemory.translated.net',
    SPOTIFY: 'https://api.spotify.com/v1',
    GITHUB: 'https://api.github.com',
    CURRENCY: 'https://api.exchangerate-api.com/v4/latest',
    QR_CODE: 'https://api.qrserver.com/v1/create-qr-code'
};

const ECONOMY_CONFIG = {
    STARTING_BALANCE: 1000,
    DAILY_REWARD: 100,
    WEEKLY_REWARD: 500,
    WORK_REWARDS: {
        MIN: 50,
        MAX: 200
    },
    GAMBLE_LIMITS: {
        MIN: 10,
        MAX: 1000
    },
    ROB_SUCCESS_RATE: 0.3,
    SHOP_ITEMS: {
        PREMIUM: { price: 5000, duration: 2592000000 },
        TITLE: { price: 1000 },
        BADGE: { price: 500 }
    }
};

const GAME_CONFIG = {
    TRIVIA: {
        TIME_LIMIT: 30000,
        POINTS: 100,
        CATEGORIES: ['general', 'science', 'history', 'sports', 'entertainment']
    },
    HANGMAN: {
        TIME_LIMIT: 120000,
        MAX_WRONG: 6,
        POINTS: 150
    },
    MATH: {
        TIME_LIMIT: 15000,
        POINTS: 75,
        DIFFICULTY_LEVELS: ['easy', 'medium', 'hard']
    },
    MEMORY: {
        TIME_LIMIT: 60000,
        POINTS: 200,
        MAX_SEQUENCE: 10
    }
};

const LANGUAGES = {
    EN: { code: 'en', name: 'English', flag: '🇺🇸' },
    ES: { code: 'es', name: 'Español', flag: '🇪🇸' },
    FR: { code: 'fr', name: 'Français', flag: '🇫🇷' },
    DE: { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    PT: { code: 'pt', name: 'Português', flag: '🇵🇹' },
    AR: { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    HI: { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    ZH: { code: 'zh', name: '中文', flag: '🇨🇳' },
    JA: { code: 'ja', name: '日本語', flag: '🇯🇵' },
    KO: { code: 'ko', name: '한국어', flag: '🇰🇷' }
};

const EMOJIS = {
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    LOADING: '⏳',
    CHECKMARK: '✓',
    CROSS: '✗',
    ARROW_RIGHT: '➡️',
    ARROW_LEFT: '⬅️',
    STAR: '⭐',
    FIRE: '🔥',
    HEART: '❤️',
    THUMBS_UP: '👍',
    THUMBS_DOWN: '👎',
    CLAP: '👏',
    EYES: '👀',
    THINKING: '🤔',
    MONEY: '💰',
    DIAMOND: '💎',
    CROWN: '👑',
    ROBOT: '🤖',
    BRAIN: '🧠'
};

const COLORS = {
    PRIMARY: '#00ff88',
    SECONDARY: '#ff6b6b',
    SUCCESS: '#28a745',
    WARNING: '#ffc107',
    ERROR: '#dc3545',
    INFO: '#17a2b8',
    DARK: '#343a40',
    LIGHT: '#f8f9fa',
    PURPLE: '#6f42c1',
    PINK: '#e83e8c',
    ORANGE: '#fd7e14',
    YELLOW: '#ffc107',
    GREEN: '#28a745',
    TEAL: '#20c997',
    CYAN: '#17a2b8'
};

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    HTTP: 3,
    VERBOSE: 4,
    DEBUG: 5,
    SILLY: 6
};

const CACHE_KEYS = {
    USER_PREFIX: 'user:',
    GROUP_PREFIX: 'group:',
    COMMAND_PREFIX: 'command:',
    COOLDOWN_PREFIX: 'cooldown:',
    RATELIMIT_PREFIX: 'ratelimit:',
    SESSION_PREFIX: 'session:',
    MEDIA_PREFIX: 'media:',
    STATS_PREFIX: 'stats:'
};

const DATABASE_COLLECTIONS = {
    USERS: 'users',
    GROUPS: 'groups',
    MESSAGES: 'messages',
    COMMANDS: 'commands',
    ECONOMY: 'economy',
    GAMES: 'games',
    WARNINGS: 'warnings',
    BANS: 'bans',
    PREMIUM: 'premium',
    SETTINGS: 'settings',
    LOGS: 'logs',
    SESSIONS: 'sessions'
};

const PLUGIN_TYPES = {
    MESSAGE: 'message',
    COMMAND: 'command',
    EVENT: 'event',
    MIDDLEWARE: 'middleware',
    SERVICE: 'service'
};

const WEBHOOK_EVENTS = {
    MESSAGE_RECEIVED: 'message.received',
    COMMAND_EXECUTED: 'command.executed',
    USER_JOINED: 'user.joined',
    USER_LEFT: 'user.left',
    GROUP_CREATED: 'group.created',
    ERROR_OCCURRED: 'error.occurred'
};

const DEFAULT_SETTINGS = {
    USER: {
        language: 'en',
        timezone: 'UTC',
        notifications: true,
        privacy: {
            showOnline: true,
            allowCommands: true
        }
    },
    GROUP: {
        language: 'en',
        timezone: 'UTC',
        welcome: {
            enabled: false,
            message: 'Welcome {user} to {group}!'
        },
        goodbye: {
            enabled: false,
            message: 'Goodbye {user}!'
        },
        antilink: false,
        antispam: true,
        autodelete: false,
        onlyAdmins: false
    }
};

const BACKUP_CONFIG = {
    TYPES: ['database', 'media', 'logs', 'config'],
    FORMATS: ['zip', 'tar.gz'],
    SCHEDULE: {
        DAILY: '0 2 * * *',
        WEEKLY: '0 2 * * 0',
        MONTHLY: '0 2 1 * *'
    }
};

const ANALYTICS_EVENTS = {
    COMMAND_USED: 'command_used',
    MESSAGE_SENT: 'message_sent',
    USER_REGISTERED: 'user_registered',
    GROUP_JOINED: 'group_joined',
    ERROR_OCCURRED: 'error_occurred',
    FEATURE_USED: 'feature_used'
};

const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    REMINDER: 'reminder',
    UPDATE: 'update'
};

const SECURITY_CONFIG = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 900000,
    SESSION_DURATION: 86400000,
    TOKEN_EXPIRY: 3600000,
    PASSWORD_MIN_LENGTH: 8,
    ENCRYPTION_ALGORITHM: 'aes-256-gcm'
};

const PERFORMANCE_METRICS = {
    MEMORY_USAGE: 'memory_usage',
    CPU_USAGE: 'cpu_usage',
    RESPONSE_TIME: 'response_time',
    COMMAND_EXECUTION_TIME: 'command_execution_time',
    DATABASE_QUERY_TIME: 'database_query_time',
    API_REQUEST_TIME: 'api_request_time'
};

const SUPPORTED_FORMATS = {
    AUDIO: ['mp3', 'm4a', 'aac', 'ogg', 'wav', 'flac'],
    VIDEO: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
    IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'],
    DOCUMENT: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
};

export default {
    BOT_VERSION,
    BOT_NAME,
    BOT_AUTHOR,
    BOT_DESCRIPTION,
    MESSAGE_TYPES,
    COMMAND_CATEGORIES,
    USER_PERMISSIONS,
    GROUP_PERMISSIONS,
    COMMAND_PERMISSIONS,
    ERROR_CODES,
    STATUS_CODES,
    EVENT_TYPES,
    MIME_TYPES,
    MEDIA_LIMITS,
    RATE_LIMITS,
    COOLDOWNS,
    TIMEOUTS,
    REGEX_PATTERNS,
    API_ENDPOINTS,
    ECONOMY_CONFIG,
    GAME_CONFIG,
    LANGUAGES,
    EMOJIS,
    COLORS,
    LOG_LEVELS,
    CACHE_KEYS,
    DATABASE_COLLECTIONS,
    PLUGIN_TYPES,
    WEBHOOK_EVENTS,
    DEFAULT_SETTINGS,
    BACKUP_CONFIG,
    ANALYTICS_EVENTS,
    NOTIFICATION_TYPES,
    SECURITY_CONFIG,
    PERFORMANCE_METRICS,
    SUPPORTED_FORMATS
};