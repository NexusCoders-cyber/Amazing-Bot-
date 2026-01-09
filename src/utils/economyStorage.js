import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EconomyStorage {
    constructor() {
        this.dataPath = path.join(process.cwd(), 'data', 'economy.json');
        this.data = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            await fs.ensureDir(path.dirname(this.dataPath));
            
            if (await fs.pathExists(this.dataPath)) {
                const fileData = await fs.readJSON(this.dataPath);
                this.data = new Map(Object.entries(fileData));
                logger.info(`Loaded ${this.data.size} economy records from JSON`);
            } else {
                await this.save();
                logger.info('Created new economy JSON storage');
            }

            this.initialized = true;
        } catch (error) {
            logger.error('Failed to initialize economy storage:', error);
            throw error;
        }
    }

    async save() {
        try {
            const dataObject = Object.fromEntries(this.data);
            await fs.writeJSON(this.dataPath, dataObject, { spaces: 2 });
        } catch (error) {
            logger.error('Failed to save economy data:', error);
        }
    }

    async getUser(jid) {
        await this.initialize();
        return this.data.get(jid) || null;
    }

    async createUser(userData) {
        await this.initialize();
        
        const defaultData = {
            jid: userData.jid,
            phone: userData.phone || userData.jid.split('@')[0],
            name: userData.name || 'User',
            economy: {
                balance: 1000,
                bank: 0,
                level: 1,
                xp: 0,
                rank: 'Beginner',
                dailyStreak: 0,
                lastDaily: null,
                lastWeekly: null,
                lastWork: null,
                transactions: []
            },
            createdAt: new Date().toISOString()
        };

        this.data.set(userData.jid, defaultData);
        await this.save();
        
        return defaultData;
    }

    async updateUser(jid, updates) {
        await this.initialize();
        
        let user = this.data.get(jid);
        if (!user) {
            user = await this.createUser({ jid });
        }

        for (const [key, value] of Object.entries(updates)) {
            if (key.includes('.')) {
                const parts = key.split('.');
                let current = user;
                
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) {
                        current[parts[i]] = {};
                    }
                    current = current[parts[i]];
                }
                
                current[parts[parts.length - 1]] = value;
            } else {
                user[key] = value;
            }
        }

        user.updatedAt = new Date().toISOString();
        this.data.set(jid, user);
        await this.save();
        
        return user;
    }

    async getAllUsers(filter = {}, limit = 100, skip = 0) {
        await this.initialize();
        
        let users = Array.from(this.data.values());
        
        if (Object.keys(filter).length > 0) {
            users = users.filter(user => {
                for (const [key, value] of Object.entries(filter)) {
                    if (key.includes('.')) {
                        const parts = key.split('.');
                        let current = user;
                        for (const part of parts) {
                            current = current?.[part];
                        }
                        if (current !== value) return false;
                    } else if (user[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        }
        
        return users.slice(skip, skip + limit);
    }

    async countUsers(filter = {}) {
        await this.initialize();
        
        if (Object.keys(filter).length === 0) {
            return this.data.size;
        }
        
        const users = await this.getAllUsers(filter, Infinity, 0);
        return users.length;
    }
}

export const economyStorage = new EconomyStorage();

export const getUser = (jid) => economyStorage.getUser(jid);
export const createUser = (userData) => economyStorage.createUser(userData);
export const updateUser = (jid, updates) => economyStorage.updateUser(jid, updates);
export const getAllUsers = (filter, limit, skip) => economyStorage.getAllUsers(filter, limit, skip);
export const countUsers = (filter) => economyStorage.countUsers(filter);