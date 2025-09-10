const { cache } = require('./cache');
const logger = require('./logger');
const config = require('../config');

class AntiSpam {
    constructor() {
        this.spamTracking = new Map();
        this.violations = new Map();
        this.whitelistedUsers = new Set();
        this.patterns = {
            repeatedChars: /(.)\1{10,}/g,
            capsLock: /[A-Z]{20,}/g,
            repeatedMessages: /^(.+)$/,
            urls: /(https?:\/\/[^\s]+)/g,
            mentions: /@\d+/g,
            specialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{10,}/g
        };
        this.settings = {
            maxMessages: 5,
            timeWindow: 10000,
            maxSimilarity: 0.8,
            maxCapsPercent: 0.7,
            maxMentions: 5,
            maxUrls: 3,
            warningThreshold: 3,
            banThreshold: 5
        };
    }

    async checkSpam(userId, message, context = {}) {
        try {
            if (this.whitelistedUsers.has(userId)) {
                return { isSpam: false, reason: 'whitelisted' };
            }

            const { from, isGroup, isGroupAdmin, text } = context;
            
            if (isGroup && isGroupAdmin && !config.antiSpam?.checkAdmins) {
                return { isSpam: false, reason: 'admin_exempt' };
            }

            const checks = await Promise.all([
                this.checkMessageFrequency(userId, message),
                this.checkRepeatedContent(userId, text),
                this.checkCapsLock(text),
                this.checkRepeatedChars(text),
                this.checkExcessiveMentions(text),
                this.checkExcessiveUrls(text),
                this.checkSuspiciousPatterns(text)
            ]);

            const spamIndicators = checks.filter(check => check.isSpam);
            
            if (spamIndicators.length === 0) {
                return { isSpam: false };
            }

            const severity = this.calculateSeverity(spamIndicators);
            await this.recordViolation(userId, spamIndicators, severity);

            const action = this.determineAction(userId, severity);
            
            return {
                isSpam: true,
                severity,
                indicators: spamIndicators.map(i => i.reason),
                action,
                waitTime: action === 'throttle' ? this.calculateWaitTime(severity) : 0
            };

        } catch (error) {
            logger.error('Anti-spam check failed:', error);
            return { isSpam: false, error: error.message };
        }
    }

    async checkMessageFrequency(userId, message) {
        const key = `spam_freq_${userId}`;
        const messages = await cache.get(key) || [];
        const now = Date.now();
        
        const recentMessages = messages.filter(msg => 
            now - msg.timestamp < this.settings.timeWindow
        );

        recentMessages.push({
            timestamp: now,
            messageId: message.key?.id
        });

        await cache.set(key, recentMessages, 60);

        if (recentMessages.length > this.settings.maxMessages) {
            return {
                isSpam: true,
                reason: 'message_frequency',
                severity: Math.min(recentMessages.length / this.settings.maxMessages, 3)
            };
        }

        return { isSpam: false };
    }

    async checkRepeatedContent(userId, text) {
        if (!text || text.length < 10) return { isSpam: false };

        const key = `spam_content_${userId}`;
        const previousMessages = await cache.get(key) || [];
        const now = Date.now();

        const recentMessages = previousMessages.filter(msg => 
            now - msg.timestamp < 300000
        );

        for (const prevMsg of recentMessages) {
            const similarity = this.calculateSimilarity(text, prevMsg.content);
            if (similarity > this.settings.maxSimilarity) {
                return {
                    isSpam: true,
                    reason: 'repeated_content',
                    severity: similarity
                };
            }
        }

        recentMessages.push({
            content: text,
            timestamp: now
        });

        if (recentMessages.length > 20) {
            recentMessages.splice(0, recentMessages.length - 20);
        }

        await cache.set(key, recentMessages, 300);
        return { isSpam: false };
    }

    checkCapsLock(text) {
        if (!text || text.length < 20) return { isSpam: false };

        const capsCount = (text.match(/[A-Z]/g) || []).length;
        const totalLetters = (text.match(/[a-zA-Z]/g) || []).length;
        const capsPercent = totalLetters > 0 ? capsCount / totalLetters : 0;

        if (capsPercent > this.settings.maxCapsPercent && capsCount > 15) {
            return {
                isSpam: true,
                reason: 'excessive_caps',
                severity: capsPercent
            };
        }

        return { isSpam: false };
    }

    checkRepeatedChars(text) {
        if (!text) return { isSpam: false };

        const matches = text.match(this.patterns.repeatedChars);
        if (matches && matches.length > 0) {
            const maxLength = Math.max(...matches.map(m => m.length));
            return {
                isSpam: true,
                reason: 'repeated_characters',
                severity: Math.min(maxLength / 20, 3)
            };
        }

        return { isSpam: false };
    }

    checkExcessiveMentions(text) {
        if (!text) return { isSpam: false };

        const mentions = (text.match(this.patterns.mentions) || []).length;
        if (mentions > this.settings.maxMentions) {
            return {
                isSpam: true,
                reason: 'excessive_mentions',
                severity: mentions / this.settings.maxMentions
            };
        }

        return { isSpam: false };
    }

    checkExcessiveUrls(text) {
        if (!text) return { isSpam: false };

        const urls = (text.match(this.patterns.urls) || []).length;
        if (urls > this.settings.maxUrls) {
            return {
                isSpam: true,
                reason: 'excessive_urls',
                severity: urls / this.settings.maxUrls
            };
        }

        return { isSpam: false };
    }

    checkSuspiciousPatterns(text) {
        if (!text) return { isSpam: false };

        const suspiciousPatterns = [
            /(.{1,10})\1{5,}/g,
            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{15,}/g,
            /(buy now|click here|limited time|act fast|free money)/gi,
            /(\d{10,})/g
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(text)) {
                return {
                    isSpam: true,
                    reason: 'suspicious_pattern',
                    severity: 1.5
                };
            }
        }

        return { isSpam: false };
    }

    calculateSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;

        const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ').trim();
        const norm1 = normalize(text1);
        const norm2 = normalize(text2);

        if (norm1 === norm2) return 1;

        const longer = norm1.length > norm2.length ? norm1 : norm2;
        const shorter = norm1.length > norm2.length ? norm2 : norm1;

        if (longer.length === 0) return 1;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    calculateSeverity(indicators) {
        const totalSeverity = indicators.reduce((sum, indicator) => 
            sum + (indicator.severity || 1), 0
        );
        
        return Math.min(totalSeverity, 5);
    }

    async recordViolation(userId, indicators, severity) {
        const key = `spam_violations_${userId}`;
        const violations = await cache.get(key) || [];
        
        violations.push({
            timestamp: Date.now(),
            indicators: indicators.map(i => i.reason),
            severity
        });

        const recentViolations = violations.filter(v => 
            Date.now() - v.timestamp < 3600000
        );

        await cache.set(key, recentViolations, 3600);
        
        logger.warn(`Spam violation recorded for ${userId}:`, {
            indicators: indicators.map(i => i.reason),
            severity,
            totalViolations: recentViolations.length
        });
    }

    async determineAction(userId, severity) {
        const key = `spam_violations_${userId}`;
        const violations = await cache.get(key) || [];
        const recentViolations = violations.filter(v => 
            Date.now() - v.timestamp < 3600000
        );

        const violationCount = recentViolations.length;
        const avgSeverity = recentViolations.reduce((sum, v) => sum + v.severity, 0) / violationCount;

        if (violationCount >= this.settings.banThreshold || avgSeverity > 3) {
            return 'ban';
        } else if (violationCount >= this.settings.warningThreshold || severity > 2) {
            return 'warn';
        } else {
            return 'throttle';
        }
    }

    calculateWaitTime(severity) {
        return Math.min(severity * 5000, 30000);
    }

    async getUserViolations(userId) {
        const key = `spam_violations_${userId}`;
        const violations = await cache.get(key) || [];
        
        return violations.filter(v => 
            Date.now() - v.timestamp < 3600000
        );
    }

    async clearUserViolations(userId) {
        const key = `spam_violations_${userId}`;
        await cache.del(key);
        return true;
    }

    addToWhitelist(userId) {
        this.whitelistedUsers.add(userId);
        logger.info(`Added ${userId} to anti-spam whitelist`);
    }

    removeFromWhitelist(userId) {
        this.whitelistedUsers.delete(userId);
        logger.info(`Removed ${userId} from anti-spam whitelist`);
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        logger.info('Anti-spam settings updated:', newSettings);
    }

    async getGlobalStats() {
        try {
            const violationKeys = await cache.keys('spam_violations_*');
            const frequencyKeys = await cache.keys('spam_freq_*');
            
            let totalViolations = 0;
            let activeUsers = 0;

            for (const key of violationKeys) {
                const violations = await cache.get(key) || [];
                const recentViolations = violations.filter(v => 
                    Date.now() - v.timestamp < 3600000
                );
                
                if (recentViolations.length > 0) {
                    totalViolations += recentViolations.length;
                    activeUsers++;
                }
            }

            return {
                totalViolations,
                activeUsers,
                whitelistedUsers: this.whitelistedUsers.size,
                monitoredUsers: frequencyKeys.length,
                settings: this.settings
            };
        } catch (error) {
            logger.error('Failed to get anti-spam stats:', error);
            return null;
        }
    }

    generateSpamReport(userId) {
        return this.getUserViolations(userId).then(violations => {
            if (violations.length === 0) {
                return `✅ *Anti-Spam Report for ${userId.split('@')[0]}*\n\nNo violations found.`;
            }

            let report = `⚠️ *Anti-Spam Report for ${userId.split('@')[0]}*\n\n`;
            report += `📊 *Summary:*\n`;
            report += `├ Total Violations: ${violations.length}\n`;
            report += `├ Last Violation: ${new Date(violations[violations.length - 1].timestamp).toLocaleString()}\n`;
            report += `╰ Average Severity: ${(violations.reduce((sum, v) => sum + v.severity, 0) / violations.length).toFixed(2)}\n\n`;

            report += `📋 *Recent Violations:*\n`;
            violations.slice(-5).forEach((violation, index) => {
                report += `${index + 1}. ${violation.indicators.join(', ')} (Severity: ${violation.severity})\n`;
            });

            return report;
        });
    }

    async processSpamAction(sock, message, spamResult, context) {
        const { from, sender, isGroup } = context;
        
        switch (spamResult.action) {
            case 'throttle':
                await sock.sendMessage(from, {
                    text: `⚠️ @${sender.split('@')[0]} Please slow down your messages!`,
                    contextInfo: { mentionedJid: [sender] }
                });
                break;

            case 'warn':
                await sock.sendMessage(from, {
                    text: `🚨 @${sender.split('@')[0]} Warning: Spam detected!\n\nReason: ${spamResult.indicators.join(', ')}\n\nContinued spam will result in restrictions.`,
                    contextInfo: { mentionedJid: [sender] }
                });
                break;

            case 'ban':
                if (isGroup) {
                    try {
                        await sock.groupParticipantsUpdate(from, [sender], 'remove');
                        await sock.sendMessage(from, {
                            text: `🔨 @${sender.split('@')[0]} has been removed for spam violations.`,
                            contextInfo: { mentionedJid: [sender] }
                        });
                    } catch (error) {
                        logger.error('Failed to remove spam user:', error);
                    }
                } else {
                    await sock.sendMessage(from, {
                        text: '🚫 You have been banned from using this bot due to spam violations.'
                    });
                }
                break;
        }
    }
}

const antiSpam = new AntiSpam();

module.exports = {
    antiSpam,
    checkSpam: (userId, message, context) => antiSpam.checkSpam(userId, message, context),
    getUserViolations: (userId) => antiSpam.getUserViolations(userId),
    clearUserViolations: (userId) => antiSpam.clearUserViolations(userId),
    addToWhitelist: (userId) => antiSpam.addToWhitelist(userId),
    removeFromWhitelist: (userId) => antiSpam.removeFromWhitelist(userId),
    updateSettings: (settings) => antiSpam.updateSettings(settings),
    getGlobalStats: () => antiSpam.getGlobalStats(),
    generateSpamReport: (userId) => antiSpam.generateSpamReport(userId),
    processSpamAction: (sock, message, result, context) => antiSpam.processSpamAction(sock, message, result, context)
};