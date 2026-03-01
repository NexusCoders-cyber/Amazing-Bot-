import logger from '../utils/logger.js';
import { getCache, setCache } from '../utils/cache.js';

class AnalyticsService {
    constructor() {
        this.metrics = {
            messages: {
                total: 0,
                byType: {},
                byUser: {},
                byGroup: {}
            },
            commands: {
                total: 0,
                byCommand: {},
                byUser: {},
                successful: 0,
                failed: 0
            },
            users: {
                total: 0,
                active: 0,
                new: 0,
                premium: 0
            },
            groups: {
                total: 0,
                active: 0
            },
            performance: {
                avgResponseTime: 0,
                peakLoad: 0,
                errors: 0
            }
        };
        
        this.sessionStart = Date.now();
    }

    async trackMessage(message, user, group) {
        try {
            this.metrics.messages.total++;

            const messageType = message.messageType || 'text';
            this.metrics.messages.byType[messageType] = (this.metrics.messages.byType[messageType] || 0) + 1;

            const userId = user.jid;
            this.metrics.messages.byUser[userId] = (this.metrics.messages.byUser[userId] || 0) + 1;

            if (group) {
                const groupId = group.jid;
                this.metrics.messages.byGroup[groupId] = (this.metrics.messages.byGroup[groupId] || 0) + 1;
            }

            await this.saveMetrics();
        } catch (error) {
            logger.error('Error tracking message:', error);
        }
    }

    async trackCommand(commandName, user, success = true, responseTime = 0) {
        try {
            this.metrics.commands.total++;

            this.metrics.commands.byCommand[commandName] = (this.metrics.commands.byCommand[commandName] || 0) + 1;

            const userId = user.jid;
            this.metrics.commands.byUser[userId] = (this.metrics.commands.byUser[userId] || 0) + 1;

            if (success) {
                this.metrics.commands.successful++;
            } else {
                this.metrics.commands.failed++;
            }

            if (responseTime > 0) {
                const currentAvg = this.metrics.performance.avgResponseTime;
                const total = this.metrics.commands.total;
                this.metrics.performance.avgResponseTime = 
                    (currentAvg * (total - 1) + responseTime) / total;
            }

            await this.saveMetrics();
        } catch (error) {
            logger.error('Error tracking command:', error);
        }
    }

    async trackUser(user, isNew = false) {
        try {
            if (isNew) {
                this.metrics.users.new++;
                this.metrics.users.total++;
            }

            if (user.isPremium) {
                this.metrics.users.premium++;
            }

            await this.saveMetrics();
        } catch (error) {
            logger.error('Error tracking user:', error);
        }
    }

    async trackGroup(group, isNew = false) {
        try {
            if (isNew) {
                this.metrics.groups.total++;
            }

            await this.saveMetrics();
        } catch (error) {
            logger.error('Error tracking group:', error);
        }
    }

    async trackError(error, context = {}) {
        try {
            this.metrics.performance.errors++;

            logger.error('Analytics error tracked:', {
                error: error.message,
                stack: error.stack,
                context
            });

            await this.saveMetrics();
        } catch (err) {
            logger.error('Error tracking error:', err);
        }
    }

    async getMetrics() {
        try {
            const uptime = Date.now() - this.sessionStart;
            
            return {
                ...this.metrics,
                session: {
                    startTime: new Date(this.sessionStart),
                    uptime: uptime,
                    uptimeFormatted: this.formatUptime(uptime)
                }
            };
        } catch (error) {
            logger.error('Error getting metrics:', error);
            return null;
        }
    }

    async getCommandStats(limit = 10) {
        try {
            const commands = Object.entries(this.metrics.commands.byCommand)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);

            return {
                total: this.metrics.commands.total,
                successful: this.metrics.commands.successful,
                failed: this.metrics.commands.failed,
                successRate: (this.metrics.commands.successful / this.metrics.commands.total * 100).toFixed(2),
                topCommands: commands
            };
        } catch (error) {
            logger.error('Error getting command stats:', error);
            return null;
        }
    }

    async getUserStats(limit = 10) {
        try {
            const topUsers = Object.entries(this.metrics.messages.byUser)
                .map(([jid, count]) => ({ jid, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);

            return {
                total: this.metrics.users.total,
                active: this.metrics.users.active,
                new: this.metrics.users.new,
                premium: this.metrics.users.premium,
                topUsers
            };
        } catch (error) {
            logger.error('Error getting user stats:', error);
            return null;
        }
    }

    async getGroupStats(limit = 10) {
        try {
            const topGroups = Object.entries(this.metrics.messages.byGroup)
                .map(([jid, count]) => ({ jid, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);

            return {
                total: this.metrics.groups.total,
                active: this.metrics.groups.active,
                topGroups
            };
        } catch (error) {
            logger.error('Error getting group stats:', error);
            return null;
        }
    }

    async getPerformanceStats() {
        try {
            return {
                avgResponseTime: this.metrics.performance.avgResponseTime.toFixed(2) + 'ms',
                peakLoad: this.metrics.performance.peakLoad,
                errors: this.metrics.performance.errors,
                errorRate: (this.metrics.performance.errors / this.metrics.messages.total * 100).toFixed(2) + '%'
            };
        } catch (error) {
            logger.error('Error getting performance stats:', error);
            return null;
        }
    }

    async resetMetrics() {
        try {
            this.metrics = {
                messages: { total: 0, byType: {}, byUser: {}, byGroup: {} },
                commands: { total: 0, byCommand: {}, byUser: {}, successful: 0, failed: 0 },
                users: { total: 0, active: 0, new: 0, premium: 0 },
                groups: { total: 0, active: 0 },
                performance: { avgResponseTime: 0, peakLoad: 0, errors: 0 }
            };
            
            this.sessionStart = Date.now();
            await this.saveMetrics();
            
            logger.info('Analytics metrics reset successfully');
            return true;
        } catch (error) {
            logger.error('Error resetting metrics:', error);
            return false;
        }
    }

    async saveMetrics() {
        try {
            await setCache('analytics_metrics', this.metrics, 86400);
        } catch (error) {
            logger.error('Error saving metrics to cache:', error);
        }
    }

    async loadMetrics() {
        try {
            const cached = await getCache('analytics_metrics');
            if (cached) {
                this.metrics = cached;
                logger.info('Analytics metrics loaded from cache');
            }
        } catch (error) {
            logger.error('Error loading metrics from cache:', error);
        }
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    async generateReport() {
        try {
            const metrics = await this.getMetrics();
            const commandStats = await this.getCommandStats();
            const userStats = await this.getUserStats();
            const groupStats = await this.getGroupStats();
            const performanceStats = await this.getPerformanceStats();

            return {
                generatedAt: new Date().toISOString(),
                session: metrics.session,
                messages: metrics.messages,
                commands: commandStats,
                users: userStats,
                groups: groupStats,
                performance: performanceStats
            };
        } catch (error) {
            logger.error('Error generating report:', error);
            return null;
        }
    }
}

const analyticsService = new AnalyticsService();

await analyticsService.loadMetrics();

export default analyticsService;
