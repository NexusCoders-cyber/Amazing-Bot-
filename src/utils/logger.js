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

const logger = {
    info: (message, meta) => winstonLogger.info(message, meta || {}),
    error: (message, meta) => {
        winstonLogger.error(message, meta || {});
        if (process.env.NODE_ENV === 'production' && global.sock) {
            const cfg = global._config;
            if (cfg?.ownerNumbers?.length) {
                const errMsg = `Bot Error:\n${message}\n${meta?.message || ''}`.substring(0, 500);
                for (const owner of cfg.ownerNumbers) {
                    global.sock.sendMessage(owner, { text: errMsg }).catch(() => {});
                }
            }
        }
    },
    warn: (message, meta) => winstonLogger.warn(message, meta || {}),
    debug: (message, meta) => winstonLogger.debug(message, meta || {}),
    verbose: (message, meta) => winstonLogger.verbose(message, meta || {}),
    http: (message, meta) => winstonLogger.http(message, meta || {}),
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
