import logger from '../utils/logger.js';
import webhookHandler from '../handlers/webhookHandler.js';

class WebhookService {
    register(event, url, secret) {
        return webhookHandler.registerWebhook(event, url, secret);
    }

    unregister(event, url) {
        return webhookHandler.unregisterWebhook(event, url);
    }

    async trigger(event, data) {
        return await webhookHandler.triggerWebhook(event, data);
    }

    list() {
        return webhookHandler.listWebhooks();
    }

    stats() {
        return webhookHandler.getStats();
    }
}

const webhookService = new WebhookService();
export default webhookService;
