import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import logger from '../../utils/logger.js';
import config from '../../config.js';

const router = express.Router();

const verifyWebhookSignature = (req, res, next) => {
    const signature = req.headers['x-webhook-signature'];
    const webhookSecret = config.security.webhookSecret;
    
    if (!webhookSecret) {
        return next();
    }
    
    if (!signature) {
        return res.status(401).json({ error: 'Missing webhook signature' });
    }
    
    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
    
    if (`sha256=${expectedSignature}` !== signature) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    next();
};

router.post('/incoming', verifyWebhookSignature, [
    body('event').notEmpty().withMessage('Event type is required'),
    body('data').isObject().withMessage('Event data is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { event, data, timestamp } = req.body;
        
        logger.info(`Webhook received: ${event}`, { data });
        
        const result = global.webhookHandler ? await global.webhookHandler.processWebhook(event, data, timestamp) : null;
        
        res.json({ success: true, result });
    } catch (error) {
        logger.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

router.post('/github', (req, res) => {
    try {
        const event = req.headers['x-github-event'];
        const { action, repository, sender } = req.body;
        
        logger.info(`GitHub webhook: ${event}`, { action, repository: repository?.name, sender: sender?.login });
        
        switch (event) {
            case 'push':
                logger.info('Code pushed to repository');
                break;
            case 'release':
                logger.info('New release published');
                break;
            case 'issues':
                logger.info(`Issue ${action}`);
                break;
            default:
                logger.info(`Unhandled GitHub event: ${event}`);
        }
        
        res.json({ success: true, event, action });
    } catch (error) {
        logger.error('Error processing GitHub webhook:', error);
        res.status(500).json({ error: 'Failed to process GitHub webhook' });
    }
});

router.post('/status', verifyWebhookSignature, [
    body('status').isIn(['online', 'offline', 'error']).withMessage('Invalid status'),
    body('source').notEmpty().withMessage('Source is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { status, source, message, timestamp } = req.body;
        
        logger.info(`Status webhook: ${status} from ${source}`, { message });
        
        await global.webhookHandler?.processStatusUpdate(status, source, message, timestamp);
        
        res.json({ success: true, status, source });
    } catch (error) {
        logger.error('Error processing status webhook:', error);
        res.status(500).json({ error: 'Failed to process status webhook' });
    }
});

router.post('/test', (req, res) => {
    logger.info('Test webhook received', req.body);
    res.json({
        success: true,
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString(),
        body: req.body
    });
});

router.get('/config', (req, res) => {
    const webhookConfig = {
        enabled: !!config.security.webhookSecret,
        endpoints: {
            incoming: '/api/webhooks/incoming',
            github: '/api/webhooks/github',
            status: '/api/webhooks/status',
            test: '/api/webhooks/test'
        },
        signatureRequired: !!config.security.webhookSecret
    };
    
    res.json({ success: true, config: webhookConfig });
});

router.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'webhooks', timestamp: new Date().toISOString() });
});

export default router;
