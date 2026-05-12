import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

const logDir = path.join(process.cwd(), 'logs');
fs.ensureDirSync(logDir);

const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
        const colorMap = {
            error: chalk.red,
            warn: chalk.yellow,
            info: chalk.cyan,
            http: chalk.green,
            verbose: chalk.blue,
            debug: chalk.magenta,
            silly: chalk.gray
        };
        const colorFn = colorMap[level] || chalk.white;
        return `${chalk.gray(timestamp)} ${colorFn(level.toUpperCase().padEnd(7))} ${message}`;
    })
);

const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const transports = [
    new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
    }),
    new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5
    }),
    new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: fileFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 7
    })
];

const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports,
    exitOnError: false
});

function compactMeta(meta) {
    if (!meta) return '';
    if (meta instanceof Error) return meta.stack || meta.message || String(meta);
    if (typeof meta === 'string') return meta;
    if (typeof meta === 'object') {
        if (typeof meta.message === 'string' && meta.message.trim()) return meta.message;
        if (typeof meta.stack === 'string' && meta.stack.trim()) return meta.stack.split('\n')[0];
        try {
            return JSON.stringify(meta);
        } catch {
            return '[object]';
        }
    }
    return String(meta);
}

function formatMessage(message, meta) {
    const base = String(message || '');
    const extra = compactMeta(meta).trim();
    if (!extra) return base;
    if (base.includes(extra)) return base;
    return `${base} ${extra}`;
}

const logger = {
    info: (message, meta) => winstonLogger.info(formatMessage(message, meta)),
    error: (message, meta) => {
        const finalMessage = formatMessage(message, meta);
        winstonLogger.error(finalMessage);
        if (process.env.NODE_ENV === 'production' && global.sock) {
            const cfg = global._config;
            if (cfg?.ownerNumbers?.length) {
                const errMsg = `Bot Error:\n${finalMessage}`.substring(0, 500);
                for (const owner of cfg.ownerNumbers) {
                    global.sock.sendMessage(owner, { text: errMsg }).catch(() => {});
                }
            }
        }
    },
    warn: (message, meta) => winstonLogger.warn(formatMessage(message, meta)),
    debug: (message, meta) => winstonLogger.debug(formatMessage(message, meta)),
    verbose: (message, meta) => winstonLogger.verbose(formatMessage(message, meta)),
    http: (message, meta) => winstonLogger.http(formatMessage(message, meta)),
    logAPI: (method, path, statusCode, responseTime, userAgent = '') => {
        const status = Number(statusCode) || 0;
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'http';
        const ua = String(userAgent || '').slice(0, 120);
        winstonLogger.log(level, `${method} ${path} ${status} ${responseTime}ms ${ua}`.trim());
    },
    cleanup: async () => {
        try {
            const files = await fs.readdir(logDir);
            const maxAge = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            for (const file of files) {
                const filePath = path.join(logDir, file);
                const stats = await fs.stat(filePath);
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.remove(filePath);
                }
            }
        } catch {}
    }
};

export default logger;
