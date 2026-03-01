import logger from '../utils/logger.js';

class NotificationService {
    constructor() {
        this.subscribers = new Map();
    }

    subscribe(userId, event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, new Map());
        }
        this.subscribers.get(event).set(userId, callback);
        logger.info(`User ${userId} subscribed to ${event}`);
    }

    unsubscribe(userId, event) {
        if (this.subscribers.has(event)) {
            this.subscribers.get(event).delete(userId);
            logger.info(`User ${userId} unsubscribed from ${event}`);
        }
    }

    async notify(event, data) {
        if (!this.subscribers.has(event)) return;

        const callbacks = this.subscribers.get(event);
        for (const [userId, callback] of callbacks.entries()) {
            try {
                await callback(data);
            } catch (error) {
                logger.error(`Error notifying user ${userId}:`, error);
            }
        }
    }
}

const notificationService = new NotificationService();
export default notificationService;
