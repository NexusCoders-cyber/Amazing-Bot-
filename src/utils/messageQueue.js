const EventEmitter = require('events');
const logger = require('./logger');
const { cache } = require('./cache');

class MessageQueue extends EventEmitter {
    constructor() {
        super();
        this.queues = new Map();
        this.processing = new Map();
        this.priorities = new Map();
        this.delays = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.defaultDelay = 1000;
        this.maxConcurrent = 5;
        this.stats = {
            queued: 0,
            processed: 0,
            failed: 0,
            retried: 0
        };
    }

    addMessage(queueName, message, options = {}) {
        try {
            const {
                priority = 0,
                delay = this.defaultDelay,
                maxRetries = this.maxRetries,
                id = `${Date.now()}_${Math.random().toString(36).substring(7)}`
            } = options;

            if (!this.queues.has(queueName)) {
                this.queues.set(queueName, []);
                this.processing.set(queueName, new Set());
            }

            const queueMessage = {
                id,
                data: message,
                priority,
                delay,
                maxRetries,
                attempts: 0,
                createdAt: Date.now(),
                scheduledFor: Date.now() + delay
            };

            const queue = this.queues.get(queueName);
            queue.push(queueMessage);
            
            queue.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                return a.scheduledFor - b.scheduledFor;
            });

            this.stats.queued++;
            this.emit('message:queued', { queueName, messageId: id, queueSize: queue.length });
            
            this.processQueue(queueName);
            
            return id;
        } catch (error) {
            logger.error('Failed to add message to queue:', error);
            throw error;
        }
    }

    async processQueue(queueName) {
        if (!this.queues.has(queueName)) return;

        const queue = this.queues.get(queueName);
        const processing = this.processing.get(queueName);
        
        if (processing.size >= this.maxConcurrent) {
            return;
        }

        const now = Date.now();
        const readyMessages = queue.filter(msg => 
            msg.scheduledFor <= now && !processing.has(msg.id)
        );

        for (const message of readyMessages.slice(0, this.maxConcurrent - processing.size)) {
            processing.add(message.id);
            this.processMessage(queueName, message);
        }
    }

    async processMessage(queueName, message) {
        try {
            message.attempts++;
            
            this.emit('message:processing', { 
                queueName, 
                messageId: message.id, 
                attempt: message.attempts 
            });

            const result = await this.executeMessage(queueName, message);
            
            if (result.success) {
                await this.handleSuccess(queueName, message, result);
            } else {
                await this.handleFailure(queueName, message, result.error);
            }
        } catch (error) {
            await this.handleFailure(queueName, message, error);
        }
    }

    async executeMessage(queueName, message) {
        try {
            return new Promise((resolve) => {
                this.emit('message:execute', {
                    queueName,
                    message: message.data,
                    callback: (error, result) => {
                        if (error) {
                            resolve({ success: false, error });
                        } else {
                            resolve({ success: true, result });
                        }
                    }
                });
            });
        } catch (error) {
            return { success: false, error };
        }
    }

    async handleSuccess(queueName, message, result) {
        const queue = this.queues.get(queueName);
        const processing = this.processing.get(queueName);
        
        const index = queue.findIndex(m => m.id === message.id);
        if (index > -1) {
            queue.splice(index, 1);
        }
        
        processing.delete(message.id);
        this.stats.processed++;

        this.emit('message:completed', {
            queueName,
            messageId: message.id,
            result,
            processingTime: Date.now() - message.createdAt,
            attempts: message.attempts
        });

        logger.debug(`Message ${message.id} processed successfully in queue ${queueName}`);
        
        setImmediate(() => this.processQueue(queueName));
    }

    async handleFailure(queueName, message, error) {
        const queue = this.queues.get(queueName);
        const processing = this.processing.get(queueName);
        
        processing.delete(message.id);

        if (message.attempts < message.maxRetries) {
            message.scheduledFor = Date.now() + (message.delay * Math.pow(2, message.attempts - 1));
            
            queue.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                return a.scheduledFor - b.scheduledFor;
            });

            this.stats.retried++;
            
            this.emit('message:retry', {
                queueName,
                messageId: message.id,
                attempt: message.attempts,
                maxRetries: message.maxRetries,
                nextAttempt: message.scheduledFor
            });

            setTimeout(() => this.processQueue(queueName), message.delay);
        } else {
            const index = queue.findIndex(m => m.id === message.id);
            if (index > -1) {
                queue.splice(index, 1);
            }

            this.stats.failed++;
            
            this.emit('message:failed', {
                queueName,
                messageId: message.id,
                error: error.message || error,
                attempts: message.attempts
            });

            logger.error(`Message ${message.id} failed permanently in queue ${queueName}:`, error);
        }

        setImmediate(() => this.processQueue(queueName));
    }

    removeMessage(queueName, messageId) {
        const queue = this.queues.get(queueName);
        if (!queue) return false;

        const index = queue.findIndex(m => m.id === messageId);
        if (index > -1) {
            queue.splice(index, 1);
            this.emit('message:removed', { queueName, messageId });
            return true;
        }

        return false;
    }

    clearQueue(queueName) {
        if (this.queues.has(queueName)) {
            const queue = this.queues.get(queueName);
            const count = queue.length;
            queue.length = 0;
            
            this.emit('queue:cleared', { queueName, messagesCleared: count });
            return count;
        }
        
        return 0;
    }

    pauseQueue(queueName) {
        this.delays.set(queueName, true);
        this.emit('queue:paused', { queueName });
        logger.info(`Queue ${queueName} paused`);
    }

    resumeQueue(queueName) {
        this.delays.delete(queueName);
        this.emit('queue:resumed', { queueName });
        logger.info(`Queue ${queueName} resumed`);
        this.processQueue(queueName);
    }

    getQueueStatus(queueName) {
        const queue = this.queues.get(queueName) || [];
        const processing = this.processing.get(queueName) || new Set();
        
        return {
            name: queueName,
            pending: queue.length,
            processing: processing.size,
            paused: this.delays.has(queueName),
            oldestMessage: queue.length > 0 ? queue[queue.length - 1].createdAt : null
        };
    }

    getAllQueues() {
        const queues = [];
        
        for (const queueName of this.queues.keys()) {
            queues.push(this.getQueueStatus(queueName));
        }
        
        return queues;
    }

    getStats() {
        const queueStats = this.getAllQueues();
        const totalPending = queueStats.reduce((sum, q) => sum + q.pending, 0);
        const totalProcessing = queueStats.reduce((sum, q) => sum + q.processing, 0);
        
        return {
            ...this.stats,
            totalPending,
            totalProcessing,
            totalQueues: this.queues.size,
            queues: queueStats
        };
    }

    async scheduleMessage(queueName, message, scheduleTime, options = {}) {
        const delay = scheduleTime - Date.now();
        
        if (delay <= 0) {
            return this.addMessage(queueName, message, options);
        }

        return this.addMessage(queueName, message, {
            ...options,
            delay
        });
    }

    async scheduleRecurring(queueName, message, interval, options = {}) {
        const { maxOccurrences = Infinity, endTime } = options;
        let occurrences = 0;

        const scheduleNext = () => {
            if (occurrences >= maxOccurrences) return;
            if (endTime && Date.now() >= endTime) return;

            this.addMessage(queueName, message, {
                ...options,
                id: `recurring_${Date.now()}_${occurrences}`
            });

            occurrences++;
            setTimeout(scheduleNext, interval);
        };

        scheduleNext();
    }

    createPriorityMessage(queueName, message, priority = 10) {
        return this.addMessage(queueName, message, { priority });
    }

    createDelayedMessage(queueName, message, delay) {
        return this.addMessage(queueName, message, { delay });
    }

    async bulkAdd(queueName, messages, options = {}) {
        const messageIds = [];
        
        for (const message of messages) {
            const id = this.addMessage(queueName, message, options);
            messageIds.push(id);
        }
        
        return messageIds;
    }

    async drain(queueName, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkEmpty = () => {
                const status = this.getQueueStatus(queueName);
                
                if (status.pending === 0 && status.processing === 0) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Drain timeout exceeded'));
                } else {
                    setTimeout(checkEmpty, 100);
                }
            };
            
            checkEmpty();
        });
    }

    async persistQueue(queueName) {
        try {
            const queue = this.queues.get(queueName) || [];
            const key = `queue_${queueName}`;
            
            await cache.set(key, queue, 3600);
            return true;
        } catch (error) {
            logger.error('Failed to persist queue:', error);
            return false;
        }
    }

    async restoreQueue(queueName) {
        try {
            const key = `queue_${queueName}`;
            const savedQueue = await cache.get(key);
            
            if (savedQueue) {
                this.queues.set(queueName, savedQueue);
                this.processing.set(queueName, new Set());
                
                this.processQueue(queueName);
                return savedQueue.length;
            }
            
            return 0;
        } catch (error) {
            logger.error('Failed to restore queue:', error);
            return 0;
        }
    }

    generateQueueReport() {
        const stats = this.getStats();
        const queues = this.getAllQueues();
        
        let report = `📊 *Message Queue Report*\n\n`;
        report += `📈 *Global Statistics:*\n`;
        report += `├ Total Queued: ${stats.queued}\n`;
        report += `├ Processed: ${stats.processed}\n`;
        report += `├ Failed: ${stats.failed}\n`;
        report += `├ Retried: ${stats.retried}\n`;
        report += `├ Success Rate: ${stats.queued > 0 ? ((stats.processed / stats.queued) * 100).toFixed(1) : 0}%\n`;
        report += `╰ Active Queues: ${stats.totalQueues}\n\n`;

        if (queues.length > 0) {
            report += `📋 *Queue Status:*\n`;
            queues.forEach(queue => {
                const status = queue.paused ? '⏸️' : '▶️';
                report += `${status} *${queue.name}*\n`;
                report += `   Pending: ${queue.pending} | Processing: ${queue.processing}\n`;
            });
        }

        return report;
    }

    setupHealthCheck() {
        setInterval(() => {
            const stats = this.getStats();
            
            if (stats.totalPending > 1000) {
                logger.warn('Message queue backlog detected:', stats);
                this.emit('queue:backlog', stats);
            }
            
            for (const [queueName, queue] of this.queues) {
                const processing = this.processing.get(queueName);
                
                if (queue.length > 0 && processing.size === 0) {
                    logger.debug(`Restarting stalled queue: ${queueName}`);
                    this.processQueue(queueName);
                }
            }
        }, 30000);
    }
}

const messageQueue = new MessageQueue();

messageQueue.setupHealthCheck();

module.exports = {
    messageQueue,
    addMessage: (queueName, message, options) => messageQueue.addMessage(queueName, message, options),
    removeMessage: (queueName, messageId) => messageQueue.removeMessage(queueName, messageId),
    clearQueue: (queueName) => messageQueue.clearQueue(queueName),
    pauseQueue: (queueName) => messageQueue.pauseQueue(queueName),
    resumeQueue: (queueName) => messageQueue.resumeQueue(queueName),
    getQueueStatus: (queueName) => messageQueue.getQueueStatus(queueName),
    getAllQueues: () => messageQueue.getAllQueues(),
    getStats: () => messageQueue.getStats(),
    scheduleMessage: (queueName, message, scheduleTime, options) => messageQueue.scheduleMessage(queueName, message, scheduleTime, options),
    scheduleRecurring: (queueName, message, interval, options) => messageQueue.scheduleRecurring(queueName, message, interval, options),
    createPriorityMessage: (queueName, message, priority) => messageQueue.createPriorityMessage(queueName, message, priority),
    createDelayedMessage: (queueName, message, delay) => messageQueue.createDelayedMessage(queueName, message, delay),
    bulkAdd: (queueName, messages, options) => messageQueue.bulkAdd(queueName, messages, options),
    drain: (queueName, timeout) => messageQueue.drain(queueName, timeout),
    persistQueue: (queueName) => messageQueue.persistQueue(queueName),
    restoreQueue: (queueName) => messageQueue.restoreQueue(queueName),
    generateQueueReport: () => messageQueue.generateQueueReport()
};