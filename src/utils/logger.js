const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class Logger {
    constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        this.initialized = false;
        this.logger = null;
        this.setupComplete = false;
    }

    async init() {
        if (this.initialized) return this.logger;

        try {
            await fs.ensureDir(this.logDir);

            const customFormat = winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.json()
            );

            const consoleFormat = winston.format.combine(
                winston.format.timestamp({ format: 'HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
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
                    const levelUpper = level.toUpperCase().padEnd(7);
                    
                    let logMessage = `${chalk.gray(timestamp)} ${colorFn(levelUpper)} ${message}`;
                    
                    if (Object.keys(meta).length > 0) {
                        logMessage += `\n${JSON.stringify(meta, null, 2)}`;
                    }

                    return logMessage;
                })
            );

            const transports = [];

            if (process.env.LOG_CONSOLE !== 'false') {
                transports.push(
                    new winston.transports.Console({
                        format: consoleFormat,
                        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
                    })
                );
            }

            if (process.env.LOG_FILE !== 'false') {
                transports.push(
                    new winston.transports.File({
                        filename: path.join(this.logDir, 'error.log'),
                        level: 'error',
                        format: customFormat,
                        maxsize: 10 * 1024 * 1024,
                        maxFiles: 5
                    }),
                    new winston.transports.File({
                        filename: path.join(this.logDir, 'combined.log'),
                        format: customFormat,
                        maxsize: 10 * 1024 * 1024,
                        maxFiles: 7
                    }),
                    new winston.transports.File({
                        filename: path.join(this.logDir, 'commands.log'),
                        level: 'info',
                        format: customFormat,
                        maxsize: 5 * 1024 * 1024,
                        maxFiles: 3
                    }),
                    new winston.transports.File({
                        filename: path.join(this.logDir, 'api.log'),
                        level: 'http',
                        format: customFormat,
                        maxsize: 5 * 1024 * 1024,
                        maxFiles: 3
                    }),
                    new winston.transports.File({
                        filename: path.join(this.logDir, 'debug.log'),
                        level: 'debug',
                        format: customFormat,
                        maxsize: 20 * 1024 * 1024,
                        maxFiles: 2
                    })
                );
            }

            this.logger = winston.createLogger({
                level: process.env.LOG_LEVEL || 'info',
                format: customFormat,
                transports,
                exitOnError: false,
                handleExceptions: true,
                handleRejections: true
            });

            this.initialized = true;
            this.setupComplete = true;
            return this.logger;
        } catch (error) {
            console.error('Logger initialization failed:', error);
            throw error;
        }
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.init();
        }
    }

    async info(message, meta = {}) {
        await this.ensureInitialized();
        this.logger.info(message, meta);
    }

    async error(message, meta = {}) {
        await this.ensureInitialized();
        this.logger.error(message, meta);
        
        if (process.env.NODE_ENV === 'production') {
            await this.notifyError(message, meta);
        }
    }

    async warn(message, meta = {}) {
        await this.ensureInitialized();
        this.logger.warn(message, meta);
    }

    async debug(message, meta = {}) {
        await this.ensureInitialized();
        this.logger.debug(message, meta);
    }

    async verbose(message, meta = {}) {
        await this.ensureInitialized();
        this.logger.verbose(message, meta);
    }

    async http(message, meta = {}) {
        await this.ensureInitialized();
        this.logger.http(message, meta);
    }

    async silly(message, meta = {}) {
        await this.ensureInitialized();
        this.logger.silly(message, meta);
    }

    async logCommand(command, user, group, executionTime) {
        const logData = {
            type: 'command',
            command,
            user: user?.jid || 'unknown',
            group: group?.jid || null,
            executionTime,
            timestamp: new Date().toISOString()
        };

        await this.info(`Command executed: ${command}`, logData);
    }

    async logError(error, context = {}) {
        const errorData = {
            type: 'error',
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        };

        await this.error(`Error occurred: ${error.message}`, errorData);
    }

    async logSecurity(event, details = {}) {
        const securityData = {
            type: 'security',
            event,
            details,
            timestamp: new Date().toISOString()
        };

        await this.warn(`Security event: ${event}`, securityData);
    }

    async logPerformance(metric, value, context = {}) {
        const perfData = {
            type: 'performance',
            metric,
            value,
            context,
            timestamp: new Date().toISOString()
        };

        await this.verbose(`Performance metric: ${metric} = ${value}`, perfData);
    }

    async logAPI(method, endpoint, statusCode, responseTime, userAgent = '') {
        const apiData = {
            type: 'api',
            method,
            endpoint,
            statusCode,
            responseTime,
            userAgent,
            timestamp: new Date().toISOString()
        };

        await this.http(`${method} ${endpoint} ${statusCode} - ${responseTime}ms`, apiData);
    }

    async logUser(action, userId, details = {}) {
        const userData = {
            type: 'user',
            action,
            userId,
            details,
            timestamp: new Date().toISOString()
        };

        await this.info(`User action: ${action} by ${userId}`, userData);
    }

    async logGroup(action, groupId, details = {}) {
        const groupData = {
            type: 'group',
            action,
            groupId,
            details,
            timestamp: new Date().toISOString()
        };

        await this.info(`Group action: ${action} in ${groupId}`, groupData);
    }

    async notifyError(message, meta) {
        try {
            const config = require('../config');
            if (!config.notifications.errors) return;

            const errorData = {
                bot: config.botName,
                error: message,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'production',
                meta: JSON.stringify(meta, null, 2)
            };

            if (global.sock && config.ownerNumbers) {
                const errorMessage = `🚨 *Bot Error Alert*

*Message:* ${message}
*Time:* ${new Date().toLocaleString()}
*Environment:* ${errorData.environment}

*Details:*
\`\`\`
${errorData.meta.substring(0, 1000)}
\`\`\``;
                
                for (const owner of config.ownerNumbers) {
                    try {
                        await global.sock.sendMessage(owner, { text: errorMessage });
                    } catch (err) {
                        console.error('Failed to send error notification:', err);
                    }
                }
            }
        } catch (error) {
            console.error('Error notification failed:', error);
        }
    }

    async cleanup() {
        try {
            const files = await fs.readdir(this.logDir);
            const now = Date.now();
            const maxAge = 30 * 24 * 60 * 60 * 1000;

            let cleanedCount = 0;

            for (const file of files) {
                const filePath = path.join(this.logDir, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.remove(filePath);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                await this.info(`Log cleanup completed: ${cleanedCount} files removed`);
            }
        } catch (error) {
            console.error('Log cleanup failed:', error);
        }
    }

    async getLogStats() {
        try {
            const files = await fs.readdir(this.logDir);
            let totalSize = 0;
            const fileStats = [];

            for (const file of files) {
                const filePath = path.join(this.logDir, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
                
                fileStats.push({
                    name: file,
                    size: Math.round(stats.size / 1024 / 1024 * 100) / 100,
                    modified: stats.mtime,
                    lines: await this.countLines(filePath)
                });
            }

            return {
                totalFiles: files.length,
                totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100,
                files: fileStats
            };
        } catch (error) {
            await this.error('Failed to get log stats:', error);
            return null;
        }
    }

    async countLines(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return content.split('\n').length;
        } catch (error) {
            return 0;
        }
    }

    async archiveLogs() {
        try {
            const archiver = require('archiver');
            const archiveDir = path.join(process.cwd(), 'backups', 'logs');
            await fs.ensureDir(archiveDir);
            
            const timestamp = new Date().toISOString().split('T')[0];
            const archivePath = path.join(archiveDir, `logs_${timestamp}.zip`);
            
            const output = fs.createWriteStream(archivePath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            archive.pipe(output);
            archive.directory(this.logDir, false);
            await archive.finalize();
            
            await this.info(`Logs archived to: ${archivePath}`);
            return archivePath;
        } catch (error) {
            await this.error('Log archiving failed:', error);
            throw error;
        }
    }

    createChildLogger(context) {
        return {
            info: (message, meta = {}) => this.info(message, { ...meta, context }),
            error: (message, meta = {}) => this.error(message, { ...meta, context }),
            warn: (message, meta = {}) => this.warn(message, { ...meta, context }),
            debug: (message, meta = {}) => this.debug(message, { ...meta, context }),
            verbose: (message, meta = {}) => this.verbose(message, { ...meta, context }),
            http: (message, meta = {}) => this.http(message, { ...meta, context }),
            silly: (message, meta = {}) => this.silly(message, { ...meta, context })
        };
    }
}

const logger = new Logger();

module.exports = logger;
