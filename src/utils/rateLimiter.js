import { cache } from './cache.js';
import logger from './logger.js';
import config from '../config.js';

class RateLimiter {
    constructor() {
        this.limits = new Map();
        this.violations = new Map();
        this.defaultLimits = {
            messages: { max: 20, window: 60000 },
            commands: { max: 10, window: 60000 },
            media: { max: 5, window: 300000 },
            api: { max: 100, window: 3600000 }
        };
    }

    async checkLimit(userId, type = 'messages', customLimit = null) {
        try {
            const limit = customLimit || this.defaultLimits[type] || this.defaultLimits.messages;
            const key = `ratelimit_${type}_${userId}`;
            
            const requests = await cache.get(key) || [];
            const now = Date.now();
            
            const validRequests = requests.filter(timestamp => 
                now - timestamp < limit.window
            );
            
            if (validRequests.length >= limit.max) {
                await this.recordViolation(userId, type);
                
                const resetTime = validRequests[0] + limit.window - now;
                return {
                    allowed: false,
                    remaining: 0,
                    resetTime,
                    retryAfter: Math.ceil(resetTime / 1000)
                };
            }
            
            validRequests.push(now);
            await cache.set(key, validRequests, Math.ceil(limit.window / 1000));
            
            return {
                allowed: true,
                remaining: limit.max - validRequests.length,
                resetTime: validRequests[0] + limit.window - now,
                retryAfter: 0
            };
        } catch (error) {
            logger.error('Rate limit check failed:', error);
            return { allowed: true, remaining: 0, resetTime: 0, retryAfter: 0 };
        }
    }

    async recordViolation(userId, type) {
        const key = `violations_${userId}`;
        const violations = await cache.get(key) || [];
        
        violations.push({
            type,
            timestamp: Date.now(),
            ip: null
        });
        
        await cache.set(key, violations, 3600);
        
        if (violations.length >= 5) {
            await this.temporaryBan(userId, 3600000);
            logger.warn(`User ${userId} temporarily banned for rate limit violations`);
        }
    }

    async temporaryBan(userId, duration) {
        const key = `tempban_${userId}`;
        const banData = {
            userId,
            bannedAt: Date.now(),
            duration,
            reason: 'Rate limit violations'
        };
        
        await cache.set(key, banData, Math.ceil(duration / 1000));
    }

    async isTemporaryBanned(userId) {
        const key = `tempban_${userId}`;
        const banData = await cache.get(key);
        
        if (!banData) return false;
        
        const now = Date.now();
        if (now - banData.bannedAt >= banData.duration) {
            await cache.del(key);
            return false;
        }
        
        return {
            banned: true,
            reason: banData.reason,
            remainingTime: banData.duration - (now - banData.bannedAt)
        };
    }

    async getUserLimits(userId) {
        const limits = {};
        
        for (const [type, limit] of Object.entries(this.defaultLimits)) {
            const key = `ratelimit_${type}_${userId}`;
            const requests = await cache.get(key) || [];
            const now = Date.now();
            
            const validRequests = requests.filter(timestamp => 
                now - timestamp < limit.window
            );
            
            limits[type] = {
                used: validRequests.length,
                max: limit.max,
                remaining: limit.max - validRequests.length,
                resetTime: validRequests.length > 0 ? 
                    validRequests[0] + limit.window - now : 0
            };
        }
        
        return limits;
    }

    async clearUserLimits(userId) {
        const types = Object.keys(this.defaultLimits);
        
        for (const type of types) {
            const key = `ratelimit_${type}_${userId}`;
            await cache.del(key);
        }
        
        await cache.del(`violations_${userId}`);
        await cache.del(`tempban_${userId}`);
        
        return true;
    }

    async getGlobalStats() {
        try {
            const keys = await cache.keys('ratelimit_*');
            const violations = await cache.keys('violations_*');
            const bans = await cache.keys('tempban_*');
            
            return {
                activeRateLimits: keys.length,
                violations: violations.length,
                temporaryBans: bans.length,
                timestamp: Date.now()
            };
        } catch (error) {
            logger.error('Failed to get rate limit stats:', error);
            return null;
        }
    }

    createUserLimiter(userId, customLimits = {}) {
        const userLimits = { ...this.defaultLimits, ...customLimits };
        
        return {
            checkMessages: () => this.checkLimit(userId, 'messages'),
            checkCommands: () => this.checkLimit(userId, 'commands'),
            checkMedia: () => this.checkLimit(userId, 'media'),
            checkAPI: () => this.checkLimit(userId, 'api'),
            checkCustom: (type, limit) => this.checkLimit(userId, type, limit),
            getLimits: () => this.getUserLimits(userId),
            clearLimits: () => this.clearUserLimits(userId),
            isBanned: () => this.isTemporaryBanned(userId)
        };
    }

    async middleware(req, res, next) {
        try {
            const userId = req.user?.id || req.ip || 'anonymous';
            const result = await this.checkLimit(userId, 'api');
            
            res.set({
                'X-RateLimit-Limit': this.defaultLimits.api.max,
                'X-RateLimit-Remaining': result.remaining,
                'X-RateLimit-Reset': new Date(Date.now() + result.resetTime).toISOString()
            });
            
            if (!result.allowed) {
                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: 'Rate limit exceeded',
                    retryAfter: result.retryAfter
                });
            }
            
            next();
        } catch (error) {
            logger.error('Rate limit middleware error:', error);
            next();
        }
    }
}

const rateLimiter = new RateLimiter();

export default {
    rateLimiter,
    checkLimit: (userId, type, customLimit) => rateLimiter.checkLimit(userId, type, customLimit),
    isTemporaryBanned: (userId) => rateLimiter.isTemporaryBanned(userId),
    getUserLimits: (userId) => rateLimiter.getUserLimits(userId),
    clearUserLimits: (userId) => rateLimiter.clearUserLimits(userId),
    getGlobalStats: () => rateLimiter.getGlobalStats(),
    createUserLimiter: (userId, limits) => rateLimiter.createUserLimiter(userId, limits),
    middleware: (req, res, next) => rateLimiter.middleware(req, res, next)
};