import config from '../config.js';
import logger from '../utils/logger.js';
import {
    commandManager,
    getCommand,
    getAllCommands,
    getCommandsByCategory,
    searchCommands as searchCommandsUtil,
    getAllCategories,
    recordCommandUsage as recordUsage
} from '../utils/commandManager.js';
import { createFontSock } from '../utils/fontSock.js';

function rawNum(jid) {
    if (!jid) return '';
    return String(jid)
        .replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '')
        .split(':')[0]
        .replace(/[^0-9]/g, '');
}

function isLidJid(jid) {
    return !!(jid && String(jid).endsWith('@lid'));
}

function getBotPhoneNum(sock) {
    const candidates = [
        sock?.user?.id,
        sock?.authState?.creds?.me?.id,
    ];
    for (const c of candidates) {
        if (!c || isLidJid(c)) continue;
        const n = rawNum(c);
        if (n && n.length >= 7) return n;
    }
    return '';
}

class CommandHandler {
    constructor() {
        this.cooldowns = new Map();
        this.commandStats = new Map();
        this.groupMetadataCache = new Map();
        this.groupCacheTTL = 30000;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            await commandManager.initializeCommands();
            this.isInitialized = true;
            logger.info(`Command handler initialized with ${getAllCommands().length} commands`);
            return true;
        } catch (error) {
            logger.error('Command handler initialization failed:', error);
            return false;
        }
    }

    async loadCommands() {
        return await this.initialize();
    }

    getCommand(name) { return getCommand(name); }
    getAllCommands() { return getAllCommands(); }
    getCommandsByCategory(cat) { return getCommandsByCategory(cat); }
    getAllCategories() { return getAllCategories(); }
    searchCommands(query) { return searchCommandsUtil(query); }
    getCommandCount() { return getAllCommands().length; }

    normalizePhoneNumber(jid) {
        if (!jid || isLidJid(jid)) return '';
        return rawNum(jid);
    }

    async getGroupMetadata(sock, groupJid, forceRefresh = false) {
        try {
            const cached = this.groupMetadataCache.get(groupJid);
            if (!forceRefresh && cached && (Date.now() - cached.timestamp) < this.groupCacheTTL) {
                return cached.data;
            }
            const metadata = await sock.groupMetadata(groupJid);
            this.groupMetadataCache.set(groupJid, { data: metadata, timestamp: Date.now() });
            return metadata;
        } catch (error) {
            logger.error('Error fetching group metadata:', error);
            return null;
        }
    }

    findParticipantByLidOrPhone(participants, jid) {
        if (!jid || !participants?.length) return null;
        const jidStr = String(jid);
        if (isLidJid(jidStr)) {
            const lidNum = jidStr.split('@')[0].split(':')[0];
            return participants.find(p => String(p.id || '').split('@')[0].split(':')[0] === lidNum) || null;
        }
        const phone = rawNum(jidStr);
        if (!phone) return null;
        return participants.find(p => {
            if (isLidJid(p.id)) return false;
            return rawNum(p.id) === phone;
        }) || null;
    }

    async resolveParticipantPhone(sock, groupJid, participantJid) {
        if (!participantJid) return '';
        if (!isLidJid(participantJid)) {
            const n = rawNum(participantJid);
            if (n && n.length >= 7) return n;
        }
        try {
            const meta = await this.getGroupMetadata(sock, groupJid, false);
            if (meta?.participants) {
                const found = this.findParticipantByLidOrPhone(meta.participants, participantJid);
                if (found && !isLidJid(found.id)) {
                    const n = rawNum(found.id);
                    if (n && n.length >= 7) return n;
                }
            }
        } catch {}
        return '';
    }

    async isGroupAdmin(sock, groupJid, participantJid) {
        try {
            const metadata = await this.getGroupMetadata(sock, groupJid, true);
            if (!metadata?.participants) return false;
            const p = this.findParticipantByLidOrPhone(metadata.participants, participantJid);
            return !!(p?.admin);
        } catch (err) {
            logger.error('isGroupAdmin error:', err);
            return false;
        }
    }

    async isBotGroupAdmin(sock, groupJid) {
        try {
            const metadata = await this.getGroupMetadata(sock, groupJid, true);
            if (!metadata?.participants) return false;
            const botNum = getBotPhoneNum(sock);
            if (botNum) {
                const bot = metadata.participants.find(p => {
                    if (isLidJid(p.id)) return false;
                    return rawNum(p.id) === botNum;
                });
                if (bot) return !!(bot.admin);
            }
            const botLidRaw = sock?.user?.lid || sock?.authState?.creds?.me?.lid || '';
            if (botLidRaw) {
                const botLid = String(botLidRaw).split('@')[0].split(':')[0];
                const byLid = metadata.participants.find(p =>
                    String(p.id || '').split('@')[0].split(':')[0] === botLid
                );
                if (byLid) return !!(byLid.admin);
            }
            logger.warn(`[isBotGroupAdmin] Bot not found in participants. botNum=${botNum}, sock.user.id=${sock?.user?.id}`);
            logger.warn(`[isBotGroupAdmin] Participants: ${metadata.participants.slice(0, 5).map(p => p.id).join(', ')}`);
            return false;
        } catch (err) {
            logger.error('isBotGroupAdmin error:', err);
            return false;
        }
    }

    isOwner(senderPhone, message, sock) {
        if (!config.ownerNumbers?.length) return false;
        const nums = new Set();
        if (senderPhone && senderPhone.length >= 7) nums.add(senderPhone);
        if (message?.key?.fromMe) {
            const botNum = getBotPhoneNum(sock);
            if (botNum) nums.add(botNum);
        }
        if (message?.key?.remoteJid && !message.key.remoteJid.endsWith('@g.us')) {
            const n = rawNum(message.key.remoteJid);
            if (n && n.length >= 7) nums.add(n);
        }
        logger.debug(`[isOwner] senderPhone=${senderPhone}, nums=${[...nums].join(',')}, ownerNumbers=${config.ownerNumbers.join(',')}`);
        for (const ownerJid of config.ownerNumbers) {
            const ownerNum = rawNum(ownerJid);
            if (ownerNum && nums.has(ownerNum)) return true;
        }
        return false;
    }

    isSudo(senderPhone, message, sock) {
        if (this.isOwner(senderPhone, message, sock)) return true;
        if (!senderPhone || !config.sudoers?.length) return false;
        for (const sudoJid of config.sudoers) {
            if (senderPhone === rawNum(sudoJid)) return true;
        }
        return false;
    }

    checkCooldown(commandName, key, isOwnerUser, isSudoUser) {
        const command = this.getCommand(commandName);
        if (!command?.cooldown) return { onCooldown: false };
        if (isOwnerUser || isSudoUser) return { onCooldown: false };
        const cooldownKey = `${commandName}_${key}`;
        const now = Date.now();
        const cooldownMs = command.cooldown * 1000;
        const expiry = this.cooldowns.get(cooldownKey);
        if (expiry && now < expiry) {
            return { onCooldown: true, timeLeft: ((expiry - now) / 1000).toFixed(1) };
        }
        this.cooldowns.set(cooldownKey, now + cooldownMs);
        setTimeout(() => this.cooldowns.delete(cooldownKey), cooldownMs);
        return { onCooldown: false };
    }

    async checkPermissions(command, sock, message, from, isGroup, isGroupAdmin, isBotAdmin, isOwnerUser, isSudoUser) {
        if (command.ownerOnly && !isOwnerUser && !isSudoUser) {
            await sock.sendMessage(from, { text: '❌ This command is only available to the bot owner.' }, { quoted: message });
            return false;
        }
        if (command.sudoOnly && !isSudoUser && !isOwnerUser) {
            await sock.sendMessage(from, { text: '❌ This command is only available to sudo users.' }, { quoted: message });
            return false;
        }
        if (command.groupOnly && !isGroup) {
            await sock.sendMessage(from, { text: '❌ This command can only be used in groups.' }, { quoted: message });
            return false;
        }
        if (command.privateOnly && isGroup) {
            await sock.sendMessage(from, { text: '❌ This command can only be used in private chat.' }, { quoted: message });
            return false;
        }
        if (isGroup && command.adminOnly && !isGroupAdmin && !isOwnerUser && !isSudoUser) {
            await sock.sendMessage(from, { text: '❌ This command requires group admin privileges.' }, { quoted: message });
            return false;
        }
        if (isGroup && command.botAdminRequired && !isBotAdmin) {
            await sock.sendMessage(from, { text: '❌ I need to be a group admin to use this command. Please promote me first.' }, { quoted: message });
            return false;
        }
        return true;
    }

    recordCommandUsage(commandName, executionTime, success) {
        if (!this.commandStats.has(commandName)) {
            this.commandStats.set(commandName, { count: 0, successCount: 0, failureCount: 0, totalTime: 0 });
        }
        const stats = this.commandStats.get(commandName);
        stats.count++;
        success ? stats.successCount++ : stats.failureCount++;
        stats.totalTime += executionTime;
        try { recordUsage(commandName, executionTime, success); } catch {}
    }

    async handleCommand(sock, message, commandName, args) {
        const startTime = Date.now();
        const from = message.key.remoteJid;
        const isGroup = from.endsWith('@g.us');

        const rawParticipant = isGroup
            ? (message.key.participant || '')
            : (message.key.fromMe ? (sock?.user?.id || '') : from);

        let senderPhone;
        if (isGroup) {
            senderPhone = await this.resolveParticipantPhone(sock, from, rawParticipant);
        } else {
            senderPhone = isLidJid(rawParticipant) ? getBotPhoneNum(sock) : rawNum(rawParticipant);
        }

        const senderJid = senderPhone ? senderPhone + '@s.whatsapp.net' : (rawParticipant || from);

        logger.debug(`[handleCommand] cmd=${commandName} rawParticipant=${rawParticipant} senderPhone=${senderPhone} isGroup=${isGroup}`);

        try {
            const command = this.getCommand(commandName);
            if (!command) return false;

            const isOwnerUser = this.isOwner(senderPhone, message, sock);
            const isSudoUser = this.isSudo(senderPhone, message, sock);

            logger.debug(`[handleCommand] isOwner=${isOwnerUser} isSudo=${isSudoUser} senderPhone=${senderPhone}`);

            const cooldownCheck = this.checkCooldown(commandName, senderPhone || from, isOwnerUser, isSudoUser);
            if (cooldownCheck.onCooldown) {
                await sock.sendMessage(from, {
                    text: `⏳ Wait ${cooldownCheck.timeLeft}s before using this command again.`
                }, { quoted: message });
                return false;
            }

            let isGroupAdmin = false;
            let isBotAdmin = false;

            if (isGroup) {
                try {
                    [isGroupAdmin, isBotAdmin] = await Promise.all([
                        this.isGroupAdmin(sock, from, rawParticipant),
                        this.isBotGroupAdmin(sock, from)
                    ]);
                } catch {
                    isGroupAdmin = false;
                    isBotAdmin = false;
                }
                if (isOwnerUser || isSudoUser) isGroupAdmin = true;
            }

            logger.debug(`[handleCommand] isGroupAdmin=${isGroupAdmin} isBotAdmin=${isBotAdmin}`);

            const hasPermission = await this.checkPermissions(
                command, sock, message, from, isGroup, isGroupAdmin, isBotAdmin, isOwnerUser, isSudoUser
            );
            if (!hasPermission) {
                this.recordCommandUsage(commandName, Date.now() - startTime, false);
                return false;
            }

            if (command.args && args.length < (command.minArgs || 1)) {
                await sock.sendMessage(from, {
                    text: `❌ Invalid usage.\n\nUsage: ${config.prefix}${command.usage || command.name}\nExample: ${config.prefix}${command.example || command.name}`
                }, { quoted: message });
                return false;
            }

            if (typeof command.execute !== 'function') {
                logger.error(`Command ${commandName} has no execute function`);
                return false;
            }

            const fontSock = createFontSock(sock, senderJid);

            await command.execute({
                sock: fontSock,
                message,
                args,
                command,
                from,
                sender: senderJid,
                isGroup,
                isGroupAdmin,
                isBotAdmin,
                prefix: config.prefix,
                pushName: message.pushName,
                quoted: message.message?.extendedTextMessage?.contextInfo?.quotedMessage,
                isOwner: isOwnerUser,
                isSudo: isSudoUser
            });

            const executionTime = Date.now() - startTime;
            this.recordCommandUsage(commandName, executionTime, true);
            logger.info(`Command ${commandName} executed in ${executionTime}ms`);
            return true;

        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.recordCommandUsage(commandName, executionTime, false);
            logger.error(`Command execution error [${commandName}]:`, error);
            try {
                await sock.sendMessage(from, { text: `❌ Error: ${error.message}` }, { quoted: message });
            } catch {}
            return false;
        }
    }

    getCommandStats() {
        const stats = { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, commandUsage: {} };
        this.commandStats.forEach((data, name) => {
            stats.totalExecutions += data.count;
            stats.successfulExecutions += data.successCount;
            stats.failedExecutions += data.failureCount;
            stats.commandUsage[name] = {
                count: data.count,
                successCount: data.successCount,
                failureCount: data.failureCount,
                avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0
            };
        });
        return stats;
    }

    getTopCommands(limit = 5) {
        return Object.entries(this.getCommandStats().commandUsage)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit)
            .map(([name, data]) => ({
                name,
                used: data.count,
                successRate: data.count > 0 ? ((data.successCount / data.count) * 100).toFixed(1) : '0'
            }));
    }

    async reloadCommand(commandName) {
        try {
            await commandManager.reloadCommand(commandName);
            return true;
        } catch (error) {
            logger.error(`Failed to reload command ${commandName}:`, error);
            return false;
        }
    }
}

export const commandHandler = new CommandHandler();
export default commandHandler;
