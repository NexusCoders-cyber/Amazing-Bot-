const NodeCache = require('node-cache');
const Redis = require('redis');
const config = require('../config');
const logger = require('./logger');

class CacheManager {
    constructor() {
        this.nodeCache = new NodeCache({
            stdTTL: config.performance.cacheTTL || 3600,
            maxKeys: config.performance.cacheSize || 1000,
            checkperiod: 120,
            useClones: false
        });
        
        this.redisClient = null;
        this.useRedis = config.redis.enabled;
        this.isInitialized = false;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    }

    async initializeCache() {
        if (this.isInitialized) return;

        try {
            if (this.useRedis) {
                await this.connectRedis();
            }
            
            this.setupEventListeners();
            this.startStatsTracking();
            
            this.isInitialized = true;
            logger.info('Cache system initialized successfully');
        } catch (error) {
            logger.error('Cache initialization failed:', error);
            throw error;
        }
    }

    async connectRedis() {
        try {
            this.redisClient = Redis.createClient(config.redis.url, config.redis.options);
            
            this.redisClient.on('error', (error) => {
                logger.error('Redis connection error:', error);
                this.useRedis = false;
            });
            
            this.redisClient.on('connect', () => {
                logger.info('Connected to Redis cache');
            });
            
            this.redisClient.on('disconnect', () => {
                logger.warn('Redis disconnected, falling back to NodeCache');
            });
            
            await this.redisClient.connect();
            
        } catch (error) {
            logger.warn('Redis connection failed, using NodeCache only:', error);
            this.useRedis = false;
        }
    }

    setupEventListeners() {
        this.nodeCache.on('set', (key, value) => {
            this.stats.sets++;
        });

        this.nodeCache.on('del', (key, value) => {
            this.stats.deletes++;
        });

        this.nodeCache.on('expired', (key, value) => {
            logger.debug(`Cache key expired: ${key}`);
        });

        this.nodeCache.on('flush', () => {
            logger.info('Cache flushed');
        });
    }

    startStatsTracking() {
        setInterval(() => {
            const nodeStats = this.nodeCache.getStats();
            logger.verbose('Cache stats:', {
                hits: this.stats.hits,
                misses: this.stats.misses,
                sets: this.stats.sets,
                deletes: this.stats.deletes,
                keys: nodeStats.keys,
                ksize: nodeStats.ksize,
                vsize: nodeStats.vsize
            });
        }, 300000);
    }

    async get(key) {
        try {
            let value = null;
            
            if (this.useRedis && this.redisClient) {
                try {
                    const redisValue = await this.redisClient.get(key);
                    if (redisValue !== null) {
                        value = JSON.parse(redisValue);
                        this.stats.hits++;
                        return value;
                    }
                } catch (error) {
                    logger.debug('Redis get error:', error);
                }
            }
            
            value = this.nodeCache.get(key);
            
            if (value !== undefined) {
                this.stats.hits++;
                return value;
            }
            
            this.stats.misses++;
            return null;
        } catch (error) {
            logger.error(`Cache get error for key ${key}:`, error);
            this.stats.misses++;
            return null;
        }
    }

    async set(key, value, ttl = null) {
        try {
            const expiry = ttl || config.performance.cacheTTL;
            
            if (this.useRedis && this.redisClient) {
                try {
                    await this.redisClient.setEx(key, expiry, JSON.stringify(value));
                } catch (error) {
                    logger.debug('Redis set error:', error);
                }
            }
            
            this.nodeCache.set(key, value, expiry);
            this.stats.sets++;
            
            return true;
        } catch (error) {
            logger.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    }

    async del(key) {
        try {
            if (this.useRedis && this.redisClient) {
                try {
                    await this.redisClient.del(key);
                } catch (error) {
                    logger.debug('Redis delete error:', error);
                }
            }
            
            const deleted = this.nodeCache.del(key);
            if (deleted > 0) {
                this.stats.deletes++;
            }
            
            return deleted > 0;
        } catch (error) {
            logger.error(`Cache delete error for key ${key}:`, error);
            return false;
        }
    }

    async has(key) {
        try {
            if (this.useRedis && this.redisClient) {
                try {
                    const exists = await this.redisClient.exists(key);
                    if (exists) return true;
                } catch (error) {
                    logger.debug('Redis exists error:', error);
                }
            }
            
            return this.nodeCache.has(key);
        } catch (error) {
            logger.error(`Cache has error for key ${key}:`, error);
            return false;
        }
    }

    async keys(pattern = '*') {
        try {
            let allKeys = [];
            
            if (this.useRedis && this.redisClient) {
                try {
                    const redisKeys = await this.redisClient.keys(pattern);
                    allKeys.push(...redisKeys);
                } catch (error) {
                    logger.debug('Redis keys error:', error);
                }
            }
            
            const nodeKeys = this.nodeCache.keys();
            if (pattern === '*') {
                allKeys.push(...nodeKeys);
            } else {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                allKeys.push(...nodeKeys.filter(key => regex.test(key)));
            }
            
            return [...new Set(allKeys)];
        } catch (error) {
            logger.error(`Cache keys error for pattern ${pattern}:`, error);
            return [];
        }
    }

    async flush() {
        try {
            if (this.useRedis && this.redisClient) {
                try {
                    await this.redisClient.flushAll();
                } catch (error) {
                    logger.debug('Redis flush error:', error);
                }
            }
            
            this.nodeCache.flushAll();
            logger.info('Cache flushed successfully');
            
            return true;
        } catch (error) {
            logger.error('Cache flush error:', error);
            return false;
        }
    }

    async flushByPattern(pattern) {
        try {
            const keys = await this.keys(pattern);
            
            for (const key of keys) {
                await this.del(key);
            }
            
            logger.info(`Flushed ${keys.length} keys matching pattern: ${pattern}`);
            return keys.length;
        } catch (error) {
            logger.error(`Cache flush by pattern error for ${pattern}:`, error);
            return 0;
        }
    }

    async mget(keys) {
        try {
            const results = {};
            
            for (const key of keys) {
                results[key] = await this.get(key);
            }
            
            return results;
        } catch (error) {
            logger.error('Cache mget error:', error);
            return {};
        }
    }

    async mset(keyValuePairs, ttl = null) {
        try {
            const results = {};
            
            for (const [key, value] of Object.entries(keyValuePairs)) {
                results[key] = await this.set(key, value, ttl);
            }
            
            return results;
        } catch (error) {
            logger.error('Cache mset error:', error);
            return {};
        }
    }

    async increment(key, value = 1, ttl = null) {
        try {
            const currentValue = (await this.get(key)) || 0;
            const newValue = currentValue + value;
            
            await this.set(key, newValue, ttl);
            return newValue;
        } catch (error) {
            logger.error(`Cache increment error for key ${key}:`, error);
            return null;
        }
    }

    async decrement(key, value = 1, ttl = null) {
        try {
            const currentValue = (await this.get(key)) || 0;
            const newValue = Math.max(0, currentValue - value);
            
            await this.set(key, newValue, ttl);
            return newValue;
        } catch (error) {
            logger.error(`Cache decrement error for key ${key}:`, error);
            return null;
        }
    }

    async getStats() {
        try {
            const nodeStats = this.nodeCache.getStats();
            const redisInfo = this.useRedis && this.redisClient ? 
                await this.redisClient.info('memory') : null;
            
            return {
                nodeCache: {
                    hits: this.stats.hits,
                    misses: this.stats.misses,
                    sets: this.stats.sets,
                    deletes: this.stats.deletes,
                    hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
                    keys: nodeStats.keys,
                    ksize: nodeStats.ksize,
                    vsize: nodeStats.vsize
                },
                redis: {
                    enabled: this.useRedis,
                    connected: this.redisClient?.isReady || false,
                    info: redisInfo
                }
            };
        } catch (error) {
            logger.error('Cache stats error:', error);
            return null;
        }
    }

    async cleanup() {
        try {
            const keys = this.nodeCache.keys();
            const now = Date.now();
            let cleanedCount = 0;
            
            for (const key of keys) {
                const ttl = this.nodeCache.getTtl(key);
                if (ttl && ttl < now) {
                    this.nodeCache.del(key);
                    cleanedCount++;
                }
            }
            
            logger.info(`Cache cleanup completed: ${cleanedCount} expired keys removed`);
            return cleanedCount;
        } catch (error) {
            logger.error('Cache cleanup error:', error);
            return 0;
        }
    }

    async warmup(data) {
        try {
            const warmupCount = Object.keys(data).length;
            
            for (const [key, value] of Object.entries(data)) {
                await this.set(key, value);
            }
            
            logger.info(`Cache warmed up with ${warmupCount} entries`);
            return warmupCount;
        } catch (error) {
            logger.error('Cache warmup error:', error);
            return 0;
        }
    }

    createNamespace(prefix) {
        return {
            get: (key) => this.get(`${prefix}:${key}`),
            set: (key, value, ttl) => this.set(`${prefix}:${key}`, value, ttl),
            del: (key) => this.del(`${prefix}:${key}`),
            has: (key) => this.has(`${prefix}:${key}`),
            keys: () => this.keys(`${prefix}:*`),
            flush: () => this.flushByPattern(`${prefix}:*`),
            increment: (key, value, ttl) => this.increment(`${prefix}:${key}`, value, ttl),
            decrement: (key, value, ttl) => this.decrement(`${prefix}:${key}`, value, ttl)
        };
    }

    async getOrSet(key, factory, ttl = null) {
        try {
            let value = await this.get(key);
            
            if (value === null) {
                value = await factory();
                if (value !== null && value !== undefined) {
                    await this.set(key, value, ttl);
                }
            }
            
            return value;
        } catch (error) {
            logger.error(`Cache getOrSet error for key ${key}:`, error);
            return null;
        }
    }

    async getSize() {
        try {
            const stats = await this.getStats();
            return {
                keys: stats.nodeCache.keys,
                memoryUsage: stats.nodeCache.vsize + stats.nodeCache.ksize
            };
        } catch (error) {
            logger.error('Cache getSize error:', error);
            return { keys: 0, memoryUsage: 0 };
        }
    }

    async isHealthy() {
        try {
            const testKey = '_health_check';
            const testValue = Date.now();
            
            await this.set(testKey, testValue, 10);
            const retrieved = await this.get(testKey);
            await this.del(testKey);
            
            return retrieved === testValue;
        } catch (error) {
            logger.error('Cache health check failed:', error);
            return false;
        }
    }

    async disconnect() {
        try {
            if (this.redisClient) {
                await this.redisClient.quit();
                this.redisClient = null;
            }
            
            this.nodeCache.flushAll();
            this.isInitialized = false;
            
            logger.info('Cache disconnected successfully');
        } catch (error) {
            logger.error('Cache disconnect error:', error);
        }
    }
}

const cacheManager = new CacheManager();

const userCache = cacheManager.createNamespace('user');
const groupCache = cacheManager.createNamespace('group');
const commandCache = cacheManager.createNamespace('command');
const mediaCache = cacheManager.createNamespace('media');
const sessionCache = cacheManager.createNamespace('session');

module.exports = {
    cache: cacheManager,
    userCache,
    groupCache,
    commandCache,
    mediaCache,
    sessionCache,
    initializeCache: () => cacheManager.initializeCache(),
    get: (key) => cacheManager.get(key),
    set: (key, value, ttl) => cacheManager.set(key, value, ttl),
    del: (key) => cacheManager.del(key),
    has: (key) => cacheManager.has(key),
    keys: (pattern) => cacheManager.keys(pattern),
    flush: () => cacheManager.flush(),
    flushByPattern: (pattern) => cacheManager.flushByPattern(pattern),
    getStats: () => cacheManager.getStats(),
    cleanup: () => cacheManager.cleanup(),
    isHealthy: () => cacheManager.isHealthy(),
    getOrSet: (key, factory, ttl) => cacheManager.getOrSet(key, factory, ttl)
};