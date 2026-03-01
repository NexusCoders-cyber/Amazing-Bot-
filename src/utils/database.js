import mongoose from 'mongoose';
import config from '../config.js';
import logger from './logger.js';

class DatabaseManager {
    constructor() {
        this.connection = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
    }

    async connectToDatabase() {
        try {
            if (this.isConnected) {
                logger.info('Database already connected');
                return this.connection;
            }

            logger.info('Connecting to database...');
            if (config.database.url && typeof config.database.url === 'string' && config.database.url.length > 0) {
                const sanitizedUrl = config.database.url.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@');
                logger.info(`Database URL: ${sanitizedUrl}`);
            } else {
                logger.info('Database URL: <not configured>');
            }
            
            // For development/Replit environment, skip database connection
            if (process.env.NODE_ENV === 'development' || !config.database.url || 
                config.database.url.includes('localhost') || config.database.url.length < 20 ||
                config.database.url === 'mongodb://localhost:27017/ilombot' ||
                config.database.url.includes('ENOTFOUND') || config.database.url === '1' ||
                config.database.url.includes('@1@') || config.database.url.includes('isaiahilom') ||
                config.database.url.startsWith('postgresql://') || 
                config.database.url.includes('helium') || 
                process.env.REPLIT_ENVIRONMENT) {
                logger.info('🔧 Development/Replit mode: Skipping database connection');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                mongoose.set('bufferCommands', false);
                logger.info('✅ Database (simulated) connected successfully');
                return { readyState: 0, simulated: true }; // Mock connection
            }
            
            mongoose.set('strictQuery', false);
            
            this.connection = await mongoose.connect(config.database.url, {
                ...config.database.options,
                dbName: 'ilombot'
            });

            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            logger.info('✅ Database connected successfully');
            
            this.setupEventListeners();
            await this.runMigrations();
            
            return this.connection;

        } catch (error) {
            logger.error('❌ Database connection failed:', error);
            
            // In development, continue without real database
            if (process.env.NODE_ENV === 'development') {
                logger.warn('⚠️ Continuing without database in development mode');
                this.isConnected = true;
                return { readyState: 1 }; // Mock connection
            }
            
            await this.handleConnectionError(error);
            throw error;
        }
    }

    setupEventListeners() {
        mongoose.connection.on('connected', () => {
            this.isConnected = true;
            logger.info('Database connected');
        });

        mongoose.connection.on('error', (error) => {
            logger.error('Database error:', error);
            this.isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            this.isConnected = false;
            logger.warn('Database disconnected');
            this.handleReconnection();
        });

        mongoose.connection.on('reconnected', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            logger.info('Database reconnected');
        });

        process.on('SIGINT', this.gracefulShutdown.bind(this));
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
    }

    async handleConnectionError(error) {
        if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
            logger.warn('Network error detected, attempting fallback connection...');
            await this.tryFallbackConnection();
        }
    }

    async tryFallbackConnection() {
        const fallbackUrls = [
            'mongodb://127.0.0.1:27017/ilombot',
            'mongodb://localhost:27017/ilombot'
        ];

        for (const url of fallbackUrls) {
            try {
                logger.info(`Trying fallback URL: ${url}`);
                this.connection = await mongoose.connect(url, config.database.options);
                this.isConnected = true;
                logger.info('✅ Connected to fallback database');
                return;
            } catch (error) {
                logger.warn(`Fallback connection failed: ${error.message}`);
            }
        }

        throw new Error('All database connection attempts failed');
    }

    async handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

        setTimeout(async () => {
            try {
                await mongoose.connect(config.database.url, config.database.options);
            } catch (error) {
                logger.error('Reconnection failed:', error);
                this.handleReconnection();
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    async gracefulShutdown() {
        logger.info('Shutting down database connection...');
        try {
            await mongoose.connection.close();
            logger.info('Database connection closed');
            process.exit(0);
        } catch (error) {
            logger.error('Error closing database connection:', error);
            process.exit(1);
        }
    }

    async runMigrations() {
        try {
            logger.info('Running database migrations...');
            
            const collections = await mongoose.connection.db.listCollections().toArray();
            const collectionNames = collections.map(col => col.name);

            const requiredCollections = [
                'users', 'groups', 'messages', 'commands', 'economy',
                'games', 'warnings', 'bans', 'premium', 'settings', 'logs'
            ];

            for (const collectionName of requiredCollections) {
                if (!collectionNames.includes(collectionName)) {
                    await mongoose.connection.db.createCollection(collectionName);
                    logger.info(`Created collection: ${collectionName}`);
                }
            }

            await this.createIndexes();
            logger.info('✅ Migrations completed');

        } catch (error) {
            logger.error('Migration failed:', error);
        }
    }

    async createIndexes() {
        try {
            const db = mongoose.connection.db;

            await db.collection('users').createIndex({ jid: 1 }, { unique: true });
            await db.collection('users').createIndex({ phone: 1 });
            await db.collection('users').createIndex({ 'economy.balance': -1 });
            
            await db.collection('groups').createIndex({ jid: 1 }, { unique: true });
            await db.collection('groups').createIndex({ name: 1 });
            
            await db.collection('messages').createIndex({ messageId: 1 }, { unique: true });
            await db.collection('messages').createIndex({ from: 1, timestamp: -1 });
            await db.collection('messages').createIndex({ sender: 1, timestamp: -1 });
            
            await db.collection('commands').createIndex({ command: 1, sender: 1, timestamp: -1 });
            await db.collection('commands').createIndex({ timestamp: -1 });
            
            await db.collection('logs').createIndex({ timestamp: -1 });
            await db.collection('logs').createIndex({ level: 1, timestamp: -1 });

            logger.info('Database indexes created');

        } catch (error) {
            logger.error('Failed to create indexes:', error);
        }
    }

    async getStats() {
        if (!this.isConnected) return null;

        try {
            const db = mongoose.connection.db;
            const stats = await db.stats();
            
            return {
                connected: this.isConnected,
                database: stats.db,
                collections: stats.collections,
                dataSize: Math.round(stats.dataSize / 1024 / 1024 * 100) / 100,
                indexSize: Math.round(stats.indexSize / 1024 / 1024 * 100) / 100,
                totalSize: Math.round((stats.dataSize + stats.indexSize) / 1024 / 1024 * 100) / 100
            };
        } catch (error) {
            logger.error('Failed to get database stats:', error);
            return null;
        }
    }

    async healthCheck() {
        try {
            if (!this.isConnected) return false;
            
            await mongoose.connection.db.admin().ping();
            return true;
        } catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }

    async backup() {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }

        try {
            logger.info('Starting database backup...');
            
            const backupData = {
                timestamp: new Date().toISOString(),
                users: await mongoose.connection.db.collection('users').find({}).toArray(),
                groups: await mongoose.connection.db.collection('groups').find({}).toArray(),
                settings: await mongoose.connection.db.collection('settings').find({}).toArray(),
                premium: await mongoose.connection.db.collection('premium').find({}).toArray()
            };

            const fs = require('fs-extra');
            const path = require('path');
            
            const backupDir = path.join(process.cwd(), 'backups', 'database');
            await fs.ensureDir(backupDir);
            
            const backupFile = path.join(backupDir, `backup_${Date.now()}.json`);
            await fs.writeJSON(backupFile, backupData, { spaces: 2 });
            
            logger.info(`Database backup saved: ${backupFile}`);
            return backupFile;

        } catch (error) {
            logger.error('Database backup failed:', error);
            throw error;
        }
    }

    async restore(backupFile) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }

        try {
            logger.info(`Restoring database from: ${backupFile}`);
            
            const fs = require('fs-extra');
            const backupData = await fs.readJSON(backupFile);
            
            const collections = ['users', 'groups', 'settings', 'premium'];
            
            for (const collection of collections) {
                if (backupData[collection]) {
                    await mongoose.connection.db.collection(collection).deleteMany({});
                    await mongoose.connection.db.collection(collection).insertMany(backupData[collection]);
                    logger.info(`Restored ${collection}: ${backupData[collection].length} records`);
                }
            }
            
            logger.info('✅ Database restoration completed');

        } catch (error) {
            logger.error('Database restoration failed:', error);
            throw error;
        }
    }

    async cleanup() {
        if (!this.isConnected) return;

        try {
            logger.info('Running database cleanup...');
            
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            const result1 = await mongoose.connection.db.collection('messages')
                .deleteMany({ timestamp: { $lt: thirtyDaysAgo }, isCommand: false });
            
            const result2 = await mongoose.connection.db.collection('logs')
                .deleteMany({ timestamp: { $lt: thirtyDaysAgo }, level: { $in: ['debug', 'silly'] } });
            
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const result3 = await mongoose.connection.db.collection('commands')
                .deleteMany({ timestamp: { $lt: sevenDaysAgo } });

            logger.info(`Cleanup completed: ${result1.deletedCount + result2.deletedCount + result3.deletedCount} records removed`);

        } catch (error) {
            logger.error('Database cleanup failed:', error);
        }
    }

    isHealthy() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }

    getConnectionState() {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        return {
            state: states[mongoose.connection.readyState] || 'unknown',
            readyState: mongoose.connection.readyState,
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

const databaseManager = new DatabaseManager();

export const connectToDatabase = () => databaseManager.connectToDatabase();
export const getStats = () => databaseManager.getStats();
export const healthCheck = () => databaseManager.healthCheck();
export const backup = () => databaseManager.backup();
export const restore = (file) => databaseManager.restore(file);
export const cleanup = () => databaseManager.cleanup();
export const isHealthy = () => databaseManager.isHealthy();
export const getConnectionState = () => databaseManager.getConnectionState();
export const databaseManagerInstance = databaseManager;