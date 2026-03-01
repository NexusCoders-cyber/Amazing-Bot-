import cron from 'node-cron';
import EventEmitter from 'events';
import logger from './logger.js';
import { cache } from './cache.js';
import config from '../config.js';

class TaskScheduler extends EventEmitter {
    constructor() {
        super();
        this.tasks = new Map();
        this.runningTasks = new Set();
        this.taskHistory = [];
        this.isInitialized = false;
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            activeTasks: 0
        };
    }

    async startScheduler() {
        if (this.isInitialized) return;

        try {
            await this.initializeDefaultTasks();
            await this.loadSavedTasks();
            
            this.setupEventListeners();
            this.startStatsTracking();
            
            this.isInitialized = true;
            logger.info(`Task scheduler initialized with ${this.tasks.size} tasks`);
        } catch (error) {
            logger.error('Task scheduler initialization failed:', error);
            throw error;
        }
    }

    async initializeDefaultTasks() {
        const defaultTasks = [
            {
                name: 'database-cleanup',
                schedule: '0 2 * * *',
                description: 'Clean up old database records',
                enabled: true,
                task: async () => {
                    const { cleanup } = await import('./database.js');
                    await cleanup();
                    logger.info('Database cleanup completed');
                }
            },
            {
                name: 'cache-cleanup',
                schedule: '*/30 * * * *',
                description: 'Clean expired cache entries',
                enabled: true,
                task: async () => {
                    await cache.cleanup();
                    logger.debug('Cache cleanup completed');
                }
            },
            {
                name: 'log-rotation',
                schedule: '0 0 * * 0',
                description: 'Rotate and archive logs',
                enabled: true,
                task: async () => {
                    await logger.cleanup();
                    logger.info('Log rotation completed');
                }
            },
            {
                name: 'backup-database',
                schedule: '0 3 * * 0',
                description: 'Create database backup',
                enabled: config.backup.enabled,
                task: async () => {
                    const { backup } = await import('./database.js');
                    const backupFile = await backup();
                    logger.info(`Database backup created: ${backupFile}`);
                }
            },
            {
                name: 'update-user-stats',
                schedule: '0 1 * * *',
                description: 'Update user statistics',
                enabled: true,
                task: async () => {
                    await this.updateUserStats();
                    logger.info('User statistics updated');
                }
            },
            {
                name: 'check-premium-expiry',
                schedule: '0 0 * * *',
                description: 'Check premium subscriptions',
                enabled: true,
                task: async () => {
                    await this.checkPremiumExpiry();
                    logger.info('Premium subscriptions checked');
                }
            },
            {
                name: 'send-daily-stats',
                schedule: '0 9 * * *',
                description: 'Send daily statistics to owner',
                enabled: config.notifications.updates,
                task: async () => {
                    await this.sendDailyStats();
                    logger.info('Daily stats sent');
                }
            }
        ];

        for (const taskData of defaultTasks) {
            this.addTask(taskData);
        }
    }

    async loadSavedTasks() {
        try {
            const savedTasks = await cache.get('scheduled_tasks') || [];
            
            for (const taskData of savedTasks) {
                this.addTask(taskData);
            }

            logger.info(`Loaded ${savedTasks.length} saved tasks`);
        } catch (error) {
            logger.error('Failed to load saved tasks:', error);
        }
    }

    async saveTasks() {
        try {
            const tasksData = Array.from(this.tasks.values()).map(task => ({
                name: task.name,
                schedule: task.schedule,
                description: task.description,
                enabled: task.enabled,
                taskString: task.task ? task.task.toString() : null
            }));

            await cache.set('scheduled_tasks', tasksData, 86400);
            logger.debug('Tasks saved to cache');
        } catch (error) {
            logger.error('Failed to save tasks:', error);
        }
    }

    setupEventListeners() {
        this.on('task:started', (taskName) => {
            this.runningTasks.add(taskName);
            this.stats.activeTasks = this.runningTasks.size;
        });

        this.on('task:completed', (taskName, duration) => {
            this.runningTasks.delete(taskName);
            this.stats.completedTasks++;
            this.stats.activeTasks = this.runningTasks.size;
            
            this.taskHistory.push({
                name: taskName,
                status: 'completed',
                duration,
                timestamp: new Date()
            });
        });

        this.on('task:failed', (taskName, error) => {
            this.runningTasks.delete(taskName);
            this.stats.failedTasks++;
            this.stats.activeTasks = this.runningTasks.size;
            
            this.taskHistory.push({
                name: taskName,
                status: 'failed',
                error: error.message,
                timestamp: new Date()
            });
        });
    }

    startStatsTracking() {
        setInterval(() => {
            this.cleanupHistory();
        }, 3600000);
    }

    cleanupHistory() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.taskHistory = this.taskHistory.filter(entry => entry.timestamp > oneDayAgo);
    }

    addTask(taskData) {
        try {
            const { name, schedule, description, enabled = true, task } = taskData;
            
            if (!name || !schedule) {
                throw new Error('Task name and schedule are required');
            }

            if (!cron.validate(schedule)) {
                throw new Error(`Invalid cron schedule: ${schedule}`);
            }

            if (this.tasks.has(name)) {
                this.removeTask(name);
            }

            const taskInstance = {
                name,
                schedule,
                description: description || 'No description',
                enabled,
                task: task || (() => logger.info(`Executing task: ${name}`)),
                cronJob: null,
                created: new Date(),
                lastRun: null,
                nextRun: null
            };

            if (enabled) {
                taskInstance.cronJob = cron.schedule(schedule, async () => {
                    await this.executeTask(name);
                }, {
                    scheduled: false,
                    timezone: config.timezone || 'UTC'
                });

                taskInstance.cronJob.start();
                taskInstance.nextRun = this.getNextRunTime(schedule);
            }

            this.tasks.set(name, taskInstance);
            this.stats.totalTasks = this.tasks.size;
            
            logger.info(`Added scheduled task: ${name} (${schedule})`);
            this.emit('task:added', name, taskInstance);
            
            return true;
        } catch (error) {
            logger.error(`Failed to add task ${taskData.name}:`, error);
            return false;
        }
    }

    removeTask(name) {
        const task = this.tasks.get(name);
        if (!task) return false;

        if (task.cronJob) {
            task.cronJob.stop();
            task.cronJob.destroy();
        }

        this.tasks.delete(name);
        this.runningTasks.delete(name);
        this.stats.totalTasks = this.tasks.size;
        this.stats.activeTasks = this.runningTasks.size;

        logger.info(`Removed scheduled task: ${name}`);
        this.emit('task:removed', name);
        
        return true;
    }

    enableTask(name) {
        const task = this.tasks.get(name);
        if (!task) return false;

        if (task.enabled) return true;

        task.enabled = true;
        
        if (!task.cronJob) {
            task.cronJob = cron.schedule(task.schedule, async () => {
                await this.executeTask(name);
            }, {
                scheduled: false,
                timezone: config.timezone || 'UTC'
            });
        }

        task.cronJob.start();
        task.nextRun = this.getNextRunTime(task.schedule);

        logger.info(`Enabled task: ${name}`);
        this.emit('task:enabled', name);
        
        return true;
    }

    disableTask(name) {
        const task = this.tasks.get(name);
        if (!task) return false;

        task.enabled = false;
        
        if (task.cronJob) {
            task.cronJob.stop();
        }

        task.nextRun = null;

        logger.info(`Disabled task: ${name}`);
        this.emit('task:disabled', name);
        
        return true;
    }

    async executeTask(name, force = false) {
        const task = this.tasks.get(name);
        if (!task) return false;

        if (!force && (!task.enabled || this.runningTasks.has(name))) {
            return false;
        }

        const startTime = Date.now();
        
        try {
            logger.info(`Starting task: ${name}`);
            this.emit('task:started', name);

            await task.task();

            const duration = Date.now() - startTime;
            task.lastRun = new Date();
            task.nextRun = this.getNextRunTime(task.schedule);

            logger.info(`Task completed: ${name} (${duration}ms)`);
            this.emit('task:completed', name, duration);
            
            return true;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            logger.error(`Task failed: ${name} (${duration}ms):`, error);
            this.emit('task:failed', name, error);
            
            return false;
        }
    }

    getNextRunTime(schedule) {
        try {
            const task = cron.schedule(schedule, () => {}, { scheduled: false });
            return task.nextDate();
        } catch (error) {
            return null;
        }
    }

    getTask(name) {
        return this.tasks.get(name);
    }

    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    getActiveTasks() {
        return Array.from(this.tasks.values()).filter(task => task.enabled);
    }

    getTaskHistory(limit = 50) {
        return this.taskHistory
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    getTaskStats() {
        const tasks = Array.from(this.tasks.values());
        
        return {
            ...this.stats,
            enabledTasks: tasks.filter(t => t.enabled).length,
            disabledTasks: tasks.filter(t => !t.enabled).length,
            recentHistory: this.getTaskHistory(10)
        };
    }

    async updateUserStats() {
        try {
            const { getUserStats } = await import('../models/User.js');
            const { getGroupStats } = await import('../models/Group.js');
            
            const userStats = await getUserStats();
            const groupStats = await getGroupStats();
            
            await cache.set('daily_user_stats', userStats, 86400);
            await cache.set('daily_group_stats', groupStats, 86400);
            
            logger.info('User statistics updated');
        } catch (error) {
            logger.error('Failed to update user stats:', error);
        }
    }

    async checkPremiumExpiry() {
        try {
            const { User } = await import('../models/User.js');
            const expiredUsers = await User.find({
                isPremium: true,
                premiumUntil: { $lte: new Date() }
            });

            for (const user of expiredUsers) {
                await user.removePremium();
                logger.info(`Premium expired for user: ${user.jid}`);

                if (global.sock && config.notifications.updates) {
                    try {
                        await global.sock.sendMessage(user.jid, {
                            text: `⏰ *Premium Subscription Expired*\n\nYour premium subscription has expired.\nThank you for your support!\n\nUpgrade again with the premium command.`
                        });
                    } catch (error) {
                        logger.debug(`Failed to notify user ${user.jid}:`, error);
                    }
                }
            }

            logger.info(`Processed ${expiredUsers.length} expired premium subscriptions`);
        } catch (error) {
            logger.error('Failed to check premium expiry:', error);
        }
    }

    async sendDailyStats() {
        try {
            if (!global.sock || !config.ownerNumbers.length) return;

            const taskStats = this.getTaskStats();
            const userStats = await cache.get('daily_user_stats') || {};
            const groupStats = await cache.get('daily_group_stats') || {};
            
            const statsMessage = `📊 *Daily Bot Statistics*

👥 *Users:*
├ Total: ${userStats.total || 0}
├ Active: ${userStats.active || 0}
├ Premium: ${userStats.premium || 0}
╰ Banned: ${userStats.banned || 0}

👨‍👩‍👧‍👦 *Groups:*
├ Total: ${groupStats.total || 0}
├ Active: ${groupStats.active || 0}
├ With Welcome: ${groupStats.withWelcome || 0}
╰ Banned: ${groupStats.banned || 0}

⚙️ *Tasks:*
├ Total: ${taskStats.totalTasks}
├ Completed: ${taskStats.completedTasks}
├ Failed: ${taskStats.failedTasks}
╰ Active: ${taskStats.activeTasks}

🕐 *Generated:* ${new Date().toLocaleString()}
_Automated daily report_`;

            for (const owner of config.ownerNumbers) {
                await global.sock.sendMessage(owner, { text: statsMessage });
            }

            logger.info('Daily stats sent to owners');
        } catch (error) {
            logger.error('Failed to send daily stats:', error);
        }
    }

    scheduleOneTime(name, delay, task) {
        const executeAt = new Date(Date.now() + delay);
        
        setTimeout(async () => {
            try {
                logger.info(`Executing one-time task: ${name}`);
                await task();
                logger.info(`One-time task completed: ${name}`);
            } catch (error) {
                logger.error(`One-time task failed: ${name}:`, error);
            }
        }, delay);

        logger.info(`Scheduled one-time task: ${name} at ${executeAt.toLocaleString()}`);
    }

    generateTaskList() {
        const tasks = this.getAllTasks();
        
        let list = `⏰ *Task Scheduler*\n\n`;
        list += `📊 *Statistics:*\n`;
        list += `├ Total Tasks: ${this.stats.totalTasks}\n`;
        list += `├ Active Tasks: ${tasks.filter(t => t.enabled).length}\n`;
        list += `├ Running: ${this.stats.activeTasks}\n`;
        list += `├ Completed: ${this.stats.completedTasks}\n`;
        list += `╰ Failed: ${this.stats.failedTasks}\n\n`;

        list += `📋 *Task List:*\n`;
        tasks.forEach(task => {
            const status = task.enabled ? '🟢' : '🔴';
            const nextRun = task.nextRun ? task.nextRun.toLocaleString() : 'Never';
            
            list += `${status} *${task.name}*\n`;
            list += `   Schedule: ${task.schedule}\n`;
            list += `   Next Run: ${nextRun}\n`;
            list += `   ${task.description}\n\n`;
        });

        return list;
    }

    async stopScheduler() {
        try {
            for (const task of this.tasks.values()) {
                if (task.cronJob) {
                    task.cronJob.stop();
                    task.cronJob.destroy();
                }
            }

            await this.saveTasks();
            
            this.tasks.clear();
            this.runningTasks.clear();
            this.isInitialized = false;

            logger.info('Task scheduler stopped');
        } catch (error) {
            logger.error('Failed to stop scheduler:', error);
        }
    }
}

export const taskScheduler = new TaskScheduler();

export const startScheduler = () => taskScheduler.startScheduler();
export const addTask = (taskData) => taskScheduler.addTask(taskData);
export const removeTask = (name) => taskScheduler.removeTask(name);
export const enableTask = (name) => taskScheduler.enableTask(name);
export const disableTask = (name) => taskScheduler.disableTask(name);
export const executeTask = (name, force) => taskScheduler.executeTask(name, force);
export const getTask = (name) => taskScheduler.getTask(name);
export const getAllTasks = () => taskScheduler.getAllTasks();
export const getActiveTasks = () => taskScheduler.getActiveTasks();
export const getTaskHistory = (limit) => taskScheduler.getTaskHistory(limit);
export const getTaskStats = () => taskScheduler.getTaskStats();
export const scheduleOneTime = (name, delay, task) => taskScheduler.scheduleOneTime(name, delay, task);
export const generateTaskList = () => taskScheduler.generateTaskList();
export const stopScheduler = () => taskScheduler.stopScheduler();