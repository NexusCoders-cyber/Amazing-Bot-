import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import logger from '../../utils/logger.js';
import config from '../../config.js';

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/login', authLimiter, [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        if (username === config.adminUsername && bcrypt.compareSync(password, config.adminPasswordHash)) {
            const token = jwt.sign(
                { username, role: 'admin' },
                config.security.jwtSecret || 'fallback-secret',
                { expiresIn: '24h' }
            );

            logger.info(`Admin login successful: ${username}`);
            res.json({
                success: true,
                token,
                user: { username, role: 'admin' }
            });
        } else {
            logger.warn(`Failed login attempt: ${username}`);
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/validate', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, config.security.jwtSecret || 'fallback-secret');
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'auth', timestamp: new Date().toISOString() });
});

export default router;
