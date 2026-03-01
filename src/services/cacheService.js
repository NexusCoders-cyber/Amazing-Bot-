import NodeCache from 'node-cache';
import logger from '../utils/logger.js';

class CacheService {
    constructor() {
        this.cache = new NodeCache({
            stdTTL: 3600,
            checkperiod: 600,
            useClones: false,
            deleteOnExpire: true,
            maxKeys: 10000
        });

        this.cache.on('expired', (key, value) => {
            logger.debug(`Cache key expired: ${key}`);
        });

        this.cache.on('del', (key, value) => {
            logger.debug(`Cache key deleted: ${key}`);
        });

        this.hitCount = 0;
        this.missCount = 0;
    }

    set(key, value, ttl = null) {
        try {
            const success = ttl 
                ? this.cache.set(key, value, ttl)
                : this.cache.set(key, value);
            
            if (success) {
                logger.debug(`Cache set: ${key}`);
            }
            
            return success;
        } catch (error) {
            logger.error(`Error setting cache key ${key}:`, error);
            return false;
        }
    }

    get(key) {
        try {
            const value = this.cache.get(key);
            
            if (value !== undefined) {
                this.hitCount++;
                logger.debug(`Cache hit: ${key}`);
                return value;
            }
            
            this.missCount++;
            logger.debug(`Cache miss: ${key}`);
            return null;
        } catch (error) {
            logger.error(`Error getting cache key ${key}:`, error);
            return null;
        }
    }

    has(key) {
        return this.cache.has(key);
    }

    del(key) {
        try {
            const count = this.cache.del(key);
            logger.debug(`Cache deleted: ${key} (${count} keys)`);
            return count > 0;
        } catch (error) {
            logger.error(`Error deleting cache key ${key}:`, error);
            return false;
        }
    }

    flush() {
        try {
            this.cache.flushAll();
            this.hitCount = 0;
            this.missCount = 0;
            logger.info('Cache flushed successfully');
            return true;
        } catch (error) {
            logger.error('Error flushing cache:', error);
            return false;
        }
    }

    getStats() {
        const stats = this.cache.getStats();
        const totalRequests = this.hitCount + this.missCount;
        const hitRate = totalRequests > 0 
            ? ((this.hitCount / totalRequests) * 100).toFixed(2) 
            : 0;

        return {
            hits: this.hitCount,
            misses: this.missCount,
            hitRate: `${hitRate}%`,
            keys: stats.keys,
            ksize: stats.ksize,
            vsize: stats.vsize
        };
    }

    mset(keyValuePairs) {
        try {
            const success = this.cache.mset(keyValuePairs);
            logger.debug(`Cache mset: ${Object.keys(keyValuePairs).length} keys`);
            return success;
        } catch (error) {
            logger.error('Error in cache mset:', error);
            return false;
        }
    }

    mget(keys) {
        try {
            return this.cache.mget(keys);
        } catch (error) {
            logger.error('Error in cache mget:', error);
            return {};
        }
    }

    keys() {
        return this.cache.keys();
    }

    getTtl(key) {
        return this.cache.getTtl(key);
    }

    setTtl(key, ttl) {
        try {
            return this.cache.ttl(key, ttl);
        } catch (error) {
            logger.error(`Error setting TTL for ${key}:`, error);
            return false;
        }
    }

    async cleanup() {
        try {
            const keys = this.cache.keys();
            let cleaned = 0;

            for (const key of keys) {
                const ttl = this.cache.getTtl(key);
                if (ttl && ttl < Date.now()) {
                    this.cache.del(key);
                    cleaned++;
                }
            }

            logger.info(`Cache cleanup: ${cleaned} keys removed`);
            return cleaned;
        } catch (error) {
            logger.error('Error in cache cleanup:', error);
            return 0;
        }
    }
}

const cacheService = new CacheService();

export default cacheService;
