import express from 'express';
import { body, query, validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

const router = express.Router();

router.get('/', [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const messages = global.messageHandler ? await global.messageHandler.getRecentMessages(limit, offset) : [];
        res.json({ success: true, messages, pagination: { limit, offset } });
    } catch (error) {
        logger.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.post('/send', [
    body('to').notEmpty().withMessage('Recipient is required'),
    body('message').notEmpty().withMessage('Message content is required'),
    body('type').optional().isIn(['text', 'image', 'video', 'audio', 'document']).withMessage('Invalid message type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { to, message, type = 'text', options = {} } = req.body;
        
        const result = global.messageHandler ? await global.messageHandler.sendMessage(to, message, type, options) : null;
        res.json({ success: true, messageId: result?.messageId });
    } catch (error) {
        logger.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const stats = global.messageHandler ? await global.messageHandler.getMessageStats() : {};
        res.json({ success: true, stats });
    } catch (error) {
        logger.error('Error fetching message stats:', error);
        res.status(500).json({ error: 'Failed to fetch message stats' });
    }
});

router.get('/search', [
    query('q').notEmpty().withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { q: query, limit = 20 } = req.query;
        const results = global.messageHandler ? await global.messageHandler.searchMessages(query, limit) : [];
        
        res.json({ success: true, results, query });
    } catch (error) {
        logger.error('Error searching messages:', error);
        res.status(500).json({ error: 'Failed to search messages' });
    }
});

router.delete('/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const result = global.messageHandler ? await global.messageHandler.deleteMessage(messageId) : false;
        
        if (result) {
            res.json({ success: true, message: 'Message deleted successfully' });
        } else {
            res.status(404).json({ error: 'Message not found' });
        }
    } catch (error) {
        logger.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

router.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'messages', timestamp: new Date().toISOString() });
});

export default router;
