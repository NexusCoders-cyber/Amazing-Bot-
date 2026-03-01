import express from 'express';
import { param, body, validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const groups = global.groupHandler ? await global.groupHandler.getAllGroups() : [];
        res.json({ success: true, groups });
    } catch (error) {
        logger.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

router.get('/:groupId', [
    param('groupId').notEmpty().withMessage('Group ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { groupId } = req.params;
        const groupInfo = global.groupHandler ? await global.groupHandler.getGroupInfo(groupId) : null;
        
        if (!groupInfo) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.json({ success: true, group: groupInfo });
    } catch (error) {
        logger.error('Error fetching group info:', error);
        res.status(500).json({ error: 'Failed to fetch group info' });
    }
});

router.get('/:groupId/participants', [
    param('groupId').notEmpty().withMessage('Group ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { groupId } = req.params;
        const participants = global.groupHandler ? await global.groupHandler.getGroupParticipants(groupId) : [];
        
        res.json({ success: true, participants });
    } catch (error) {
        logger.error('Error fetching group participants:', error);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

router.post('/:groupId/message', [
    param('groupId').notEmpty().withMessage('Group ID is required'),
    body('message').notEmpty().withMessage('Message is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { groupId } = req.params;
        const { message } = req.body;
        
        const result = global.groupHandler ? await global.groupHandler.sendGroupMessage(groupId, message) : null;
        res.json({ success: true, messageId: result?.messageId });
    } catch (error) {
        logger.error('Error sending group message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

router.get('/:groupId/stats', [
    param('groupId').notEmpty().withMessage('Group ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { groupId } = req.params;
        const stats = global.groupHandler ? await global.groupHandler.getGroupStats(groupId) : {};
        
        res.json({ success: true, stats });
    } catch (error) {
        logger.error('Error fetching group stats:', error);
        res.status(500).json({ error: 'Failed to fetch group stats' });
    }
});

router.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'groups', timestamp: new Date().toISOString() });
});

export default router;
