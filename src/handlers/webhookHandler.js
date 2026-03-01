import logger from '../utils/logger.js';
import axios from 'axios';
import crypto from 'crypto';

class WebhookHandler {
    constructor() {
        this.webhooks = new Map();
        this.eventQueue = [];
        this.processing = false;
        this.maxRetries = 3;
        this.retryDelay = 5000;
    }

    registerWebhook(event, url, secret = null) {
        try {
            if (!this.webhooks.has(event)) {
                this.webhooks.set(event, []);
            }

            this.webhooks.get(event).push({
                url,
                secret,
                active: true,
                createdAt: new Date()
            });

            logger.info(`Webhook registered for event: ${event} -> ${url}`);
            return true;
        } catch (error) {
            logger.error('Error registering webhook:', error);
            return false;
        }
    }

    unregisterWebhook(event, url) {
        try {
            if (!this.webhooks.has(event)) return false;

            const hooks = this.webhooks.get(event);
            const filtered = hooks.filter(h => h.url !== url);
            
            this.webhooks.set(event, filtered);
            logger.info(`Webhook unregistered for event: ${event} -> ${url}`);
            return true;
        } catch (error) {
            logger.error('Error unregistering webhook:', error);
            return false;
        }
    }

    async triggerWebhook(event, data) {
        try {
            if (!this.webhooks.has(event)) {
                logger.debug(`No webhooks registered for event: ${event}`);
                return;
            }

            const hooks = this.webhooks.get(event).filter(h => h.active);
            
            if (hooks.length === 0) return;

            logger.info(`Triggering ${hooks.length} webhooks for event: ${event}`);

            const payload = {
                event,
                timestamp: new Date().toISOString(),
                data
            };

            const promises = hooks.map(hook => 
                this.sendWebhook(hook, payload)
            );

            await Promise.allSettled(promises);
        } catch (error) {
            logger.error('Error triggering webhooks:', error);
        }
    }

    async sendWebhook(hook, payload, retryCount = 0) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Ilom-WhatsApp-Bot/1.0',
                'X-Webhook-Event': payload.event,
                'X-Webhook-Timestamp': payload.timestamp
            };

            if (hook.secret) {
                const signature = this.generateSignature(payload, hook.secret);
                headers['X-Webhook-Signature'] = signature;
            }

            const response = await axios.post(hook.url, payload, {
                headers,
                timeout: 10000
            });

            logger.info(`Webhook sent successfully: ${hook.url} (${response.status})`);
            return response.data;
        } catch (error) {
            logger.error(`Webhook failed: ${hook.url}`, error.message);

            if (retryCount < this.maxRetries) {
                logger.info(`Retrying webhook (${retryCount + 1}/${this.maxRetries}): ${hook.url}`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.sendWebhook(hook, payload, retryCount + 1);
            }

            logger.error(`Webhook failed after ${this.maxRetries} retries: ${hook.url}`);
            return null;
        }
    }

    generateSignature(payload, secret) {
        const data = JSON.stringify(payload);
        return crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex');
    }

    verifySignature(payload, signature, secret) {
        const expectedSignature = this.generateSignature(payload, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    async handleIncomingWebhook(req, res) {
        try {
            const { event, data, source } = req.body;

            if (!event || !data) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    required: ['event', 'data']
                });
            }

            const signature = req.headers['x-webhook-signature'];
            const secret = process.env.WEBHOOK_SECRET;

            if (secret && signature) {
                const isValid = this.verifySignature(req.body, signature, secret);
                if (!isValid) {
                    return res.status(401).json({
                        error: 'Invalid signature'
                    });
                }
            }

            logger.info(`Incoming webhook received: ${event} from ${source || 'unknown'}`);

            this.eventQueue.push({
                event,
                data,
                source,
                timestamp: new Date()
            });

            if (!this.processing) {
                this.processQueue();
            }

            return res.status(200).json({
                success: true,
                message: 'Webhook received',
                event
            });
        } catch (error) {
            logger.error('Error handling incoming webhook:', error);
            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }

    async processQueue() {
        if (this.processing) return;
        
        this.processing = true;

        while (this.eventQueue.length > 0) {
            const webhookEvent = this.eventQueue.shift();
            
            try {
                await this.processWebhookEvent(webhookEvent);
            } catch (error) {
                logger.error('Error processing webhook event:', error);
            }
        }

        this.processing = false;
    }

    async processWebhookEvent(webhookEvent) {
        logger.info(`Processing webhook event: ${webhookEvent.event}`);
        
        switch (webhookEvent.event) {
            case 'message.received':
                logger.debug('Message received via webhook:', webhookEvent.data);
                break;
            case 'status.update':
                logger.debug('Status update via webhook:', webhookEvent.data);
                break;
            case 'user.action':
                logger.debug('User action via webhook:', webhookEvent.data);
                break;
            default:
                logger.debug('Unknown webhook event:', webhookEvent.event);
        }
    }

    listWebhooks() {
        const result = {};
        
        for (const [event, hooks] of this.webhooks.entries()) {
            result[event] = hooks.map(h => ({
                url: h.url,
                active: h.active,
                createdAt: h.createdAt
            }));
        }
        
        return result;
    }

    getStats() {
        let totalHooks = 0;
        let activeHooks = 0;

        for (const hooks of this.webhooks.values()) {
            totalHooks += hooks.length;
            activeHooks += hooks.filter(h => h.active).length;
        }

        return {
            totalEvents: this.webhooks.size,
            totalHooks,
            activeHooks,
            queueSize: this.eventQueue.length,
            processing: this.processing
        };
    }
}

const webhookHandler = new WebhookHandler();

export default webhookHandler;
