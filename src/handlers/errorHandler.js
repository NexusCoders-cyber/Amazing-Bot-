import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.errorLogPath = path.join(__dirname, '../../logs/errors.log');
    }

    handleError(type, error, context = {}) {
        try {
            const errorInfo = {
                type,
                message: error.message || error,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                context
            };

            const errorKey = `${type}:${error.message || error}`;
            const count = this.errorCounts.get(errorKey) || 0;
            this.errorCounts.set(errorKey, count + 1);

            if (count < 5) {
                logger.error(`${type}: ${error.message || error}`, error);
            }

            this.logToFile(errorInfo);

            if (type === 'uncaughtException' || type === 'unhandledRejection') {
                this.handleCriticalError(errorInfo);
            }

        } catch (logError) {
            console.error('Error in error handler:', logError);
        }
    }

    async logToFile(errorInfo) {
        try {
            await fs.ensureDir(path.dirname(this.errorLogPath));
            const logEntry = `${errorInfo.timestamp} [${errorInfo.type}] ${errorInfo.message}\n${errorInfo.stack || ''}\n---\n`;
            await fs.appendFile(this.errorLogPath, logEntry);
        } catch (fileError) {
            console.error('Failed to log error to file:', fileError);
        }
    }

    handleCriticalError(errorInfo) {
        console.error('Critical error occurred:', errorInfo.message);
        
        if (global.sock) {
            try {
                global.sock.end();
            } catch (e) {
                console.error('Failed to close WhatsApp connection:', e);
            }
        }
    }

    getErrorStats() {
        return Array.from(this.errorCounts.entries()).map(([key, count]) => ({
            error: key,
            count
        }));
    }

    clearErrorCounts() {
        this.errorCounts.clear();
    }
}

export default new ErrorHandler();