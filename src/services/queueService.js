import logger from '../utils/logger.js';

class QueueService {
    constructor() {
        this.queues = new Map();
        this.processing = new Map();
    }

    createQueue(name) {
        if (!this.queues.has(name)) {
            this.queues.set(name, []);
            this.processing.set(name, false);
            logger.info(`Queue created: ${name}`);
        }
    }

    async enqueue(queueName, task) {
        this.createQueue(queueName);
        this.queues.get(queueName).push(task);
        logger.debug(`Task added to queue ${queueName}`);
        
        if (!this.processing.get(queueName)) {
            await this.processQueue(queueName);
        }
    }

    async processQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue || queue.length === 0) return;

        this.processing.set(queueName, true);

        while (queue.length > 0) {
            const task = queue.shift();
            try {
                await task();
            } catch (error) {
                logger.error(`Error processing task in queue ${queueName}:`, error);
            }
        }

        this.processing.set(queueName, false);
    }

    getQueueSize(queueName) {
        return this.queues.get(queueName)?.length || 0;
    }
}

const queueService = new QueueService();
export default queueService;
