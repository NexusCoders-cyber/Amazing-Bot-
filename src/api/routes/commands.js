import express from 'express';
import { body, validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const commands = global.commandHandler ? await global.commandHandler.getAllCommands() : [];
        res.json({
            success: true,
            commands: commands.map(cmd => ({
                name: cmd.name,
                aliases: cmd.aliases,
                description: cmd.description,
                category: cmd.category,
                usage: cmd.usage,
                cooldown: cmd.cooldown,
                premium: cmd.premium,
                adminOnly: cmd.adminOnly
            }))
        });
    } catch (error) {
        logger.error('Error fetching commands:', error);
        res.status(500).json({ error: 'Failed to fetch commands' });
    }
});

router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const commands = global.commandHandler ? await global.commandHandler.getCommandsByCategory(category) : [];
        res.json({ success: true, commands });
    } catch (error) {
        logger.error('Error fetching commands by category:', error);
        res.status(500).json({ error: 'Failed to fetch commands' });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const stats = global.commandHandler ? await global.commandHandler.getCommandStats() : {};
        res.json({ success: true, stats });
    } catch (error) {
        logger.error('Error fetching command stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.post('/execute', [
    body('command').notEmpty().withMessage('Command is required'),
    body('args').isArray().optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { command, args = [] } = req.body;
        
        logger.info(`API command execution requested: ${command}`);
        
        res.json({
            success: true,
            message: 'Command execution request received',
            command,
            args,
            note: 'Commands are executed via WhatsApp messages, not API calls'
        });
    } catch (error) {
        logger.error('Error in command execution endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'commands', timestamp: new Date().toISOString() });
});

export default router;
