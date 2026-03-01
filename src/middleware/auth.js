const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Authentication middleware for API routes
 * Validates JWT tokens for protected endpoints
 */
const authMiddleware = (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : null;

        if (!token) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No token provided'
            });
        }

        // Verify token
        const jwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'fallback-secret';
        const decoded = jwt.verify(token, jwtSecret);
        
        // Add user info to request object
        req.user = decoded;
        
        // Log authenticated requests
        logger.debug(`Authenticated request: ${req.method} ${req.path}`, {
            user: decoded.username,
            ip: req.ip || req.connection.remoteAddress
        });
        
        next();
    } catch (error) {
        logger.warn('Authentication failed:', {
            error: error.message,
            ip: req.ip || req.connection.remoteAddress,
            path: req.path
        });
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Please login again'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Please provide a valid token'
            });
        }
        
        return res.status(401).json({
            error: 'Authentication failed',
            message: 'Invalid or malformed token'
        });
    }
};

/**
 * Optional authentication middleware
 * Adds user info if token is present but doesn't require it
 */
const optionalAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : null;

        if (token) {
            const jwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'fallback-secret';
            const decoded = jwt.verify(token, jwtSecret);
            req.user = decoded;
        }
        
        next();
    } catch (error) {
        // For optional auth, we don't fail on invalid tokens
        logger.debug('Optional auth failed, continuing without user:', error.message);
        next();
    }
};

/**
 * Admin role check middleware
 * Requires authentication and admin role
 */
const adminAuthMiddleware = (req, res, next) => {
    authMiddleware(req, res, (err) => {
        if (err) return next(err);
        
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Admin privileges required'
            });
        }
        
        next();
    });
};

/**
 * Rate limiting aware auth middleware
 * Implements additional security for authentication endpoints
 */
const secureAuthMiddleware = (req, res, next) => {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Continue with normal auth
    authMiddleware(req, res, next);
};

module.exports = {
    authMiddleware,
    optionalAuthMiddleware,
    adminAuthMiddleware,
    secureAuthMiddleware
};