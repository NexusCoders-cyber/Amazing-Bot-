import config from '../config.js';
import logger from '../utils/logger.js';
import { cache } from '../utils/cache.js';
import { checkAntilink } from '../commands/admin/antilink.js';
import { checkBan } from '../commands/admin/ban.js';
import { checkSpam } from '../commands/admin/antispam.js';
import { checkBadWord } from '../commands/admin/antiword.js';

let autoDownloadHandler = null;

async function getAutoDownload() {
    if (!autoDownloadHandler) {
        try {
            const mod = await import('../commands/media/autolink.js');
            autoDownloadHandler = mod.handleAutoDownload;
        } catch {
            autoDownloadHandler = async () => false;
        }
    }
    return autoDownloadHandler;
}

function resolveStanzaId(message) {
    const m = message.message;
    if (!m) return null;
    return m.extendedTextMessage?.contextInfo?.stanzaId
        || m.imageMessage?.contextInfo?.stanzaId
        || m.videoMessage?.contextInfo?.stanzaId
        || m.audioMessage?.contextInfo?.stanzaId
        || m.documentMessage?.contextInfo?.stanzaId
        || m.stickerMessage?.contextInfo?.stanzaId
        || m.ephemeralMessage?.message?.extendedTextMessage?.contextInfo?.stanzaId
        || null;
}

function normNum(jid) {
    return String(jid || '').replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '').split(':')[0].replace(/[^0-9]/g, '');
}

function findReplyHandler(stanzaId) {
    if (!global.replyHandlers || !stanzaId) return null;
    return global.replyHandlers[stanzaId]
        || global.replyHandlers[stanzaId.toLowerCase()]
        || global.replyHandlers[stanzaId.toUpperCase()]
        || null;
}

function findChatHandler(chatJid) {
    if (!global.chatHandlers || !chatJid) return null;
    return global.chatHandlers[chatJid] || null;
}

export function registerChatHandler(chatJid, handler, ttlMs = 10 * 60 * 1000) {
    if (!global.chatHandlers) global.chatHandlers = {};
    global.chatHandlers[chatJid] = { command: handler.command || 'unknown', handler: handler.handler };
    if (ttlMs > 0) {
        setTimeout(() => {
            if (global.chatHandlers?.[chatJid]?.handler === handler.handler) {
                delete global.chatHandlers[chatJid];
            }
        }, ttlMs);
    }
}

export function clearChatHandler(chatJid) {
    if (global.chatHandlers?.[chatJid]) delete global.chatHandlers[chatJid];
}

class MessageHandler {
    constructor() {
        this.commandHandler = null;
        this.isReady = false;
        this.typingIntervals = new Map();
        this.recordingIntervals = new Map();
        this.spamTracker = new Map();
        this.spamCleanupInterval = setInterval(() => this.cleanupSpamTracker(), 60000);
    }

    cleanupSpamTracker() {
        const now = Date.now();
        for (const [key, data] of this.spamTracker.entries()) {
            if (now - data.windowStart > 60000) this.spamTracker.delete(key);
        }
    }

    isSpamming(sender) {
        if (!config.antiSpam?.enabled) return false;
        const maxMessages = config.antiSpam?.maxMessages || 10;
        const windowMs = config.antiSpam?.windowMs || 10000;
        const now = Date.now();
        if (!this.spamTracker.has(sender)) {
            this.spamTracker.set(sender, { count: 1, windowStart: now });
            return false;
        }
        const data = this.spamTracker.get(sender);
        if (now - data.windowStart > windowMs) {
            data.count = 1;
            data.windowStart = now;
            return false;
        }
        data.count++;
        return data.count > maxMessages;
    }

    async initializeCommandHandler() {
        if (this.commandHandler && this.isReady) return this.commandHandler;
        try {
            const mod = await import('./commandHandler.js');
            this.commandHandler = mod.commandHandler;
            if (!this.commandHandler.isInitialized) {
                await this.commandHandler.initialize();
            }
            this.isReady = true;
            return this.commandHandler;
        } catch (error) {
            logger.error('Failed to initialize command handler:', error);
            throw error;
        }
    }

    extractText(message) {
        if (!message?.message) return '';
        const msg = message.message;
        return msg.conversation
            || msg.extendedTextMessage?.text
            || msg.imageMessage?.caption
            || msg.videoMessage?.caption
            || msg.documentMessage?.caption
            || msg.audioMessage?.caption
            || msg.stickerMessage?.caption
            || msg.viewOnceMessage?.message?.imageMessage?.caption
            || msg.viewOnceMessage?.message?.videoMessage?.caption
            || msg.ephemeralMessage?.message?.conversation
            || msg.ephemeralMessage?.message?.extendedTextMessage?.text
            || msg.buttonsResponseMessage?.selectedButtonId
            || msg.listResponseMessage?.singleSelectReply?.selectedRowId
            || msg.templateButtonReplyMessage?.selectedId
            || '';
    }

    extractMessageContent(message) {
        if (!message?.message) return null;
        const msg = message.message;
        let text = '';
        let messageType = 'text';
        let media = null;
        try {
            if (msg.conversation) {
                text = msg.conversation;
            } else if (msg.extendedTextMessage) {
                text = msg.extendedTextMessage.text || '';
            } else if (msg.imageMessage) {
                text = msg.imageMessage.caption || '';
                messageType = 'image';
                media = msg.imageMessage;
            } else if (msg.videoMessage) {
                text = msg.videoMessage.caption || '';
                messageType = 'video';
                media = msg.videoMessage;
            } else if (msg.audioMessage) {
                messageType = 'audio';
                media = msg.audioMessage;
            } else if (msg.documentMessage) {
                text = msg.documentMessage.caption || '';
                messageType = 'document';
                media = msg.documentMessage;
            } else if (msg.stickerMessage) {
                messageType = 'sticker';
                media = msg.stickerMessage;
            } else if (msg.buttonsResponseMessage) {
                text = msg.buttonsResponseMessage.selectedButtonId || '';
            } else if (msg.listResponseMessage) {
                text = msg.listResponseMessage.singleSelectReply?.selectedRowId || '';
            } else if (msg.viewOnceMessage) {
                const inner = msg.viewOnceMessage.message;
                text = inner?.imageMessage?.caption || inner?.videoMessage?.caption || '';
                messageType = inner?.imageMessage ? 'image' : inner?.videoMessage ? 'video' : 'text';
            } else if (msg.ephemeralMessage) {
                const inner = msg.ephemeralMessage.message;
                text = inner?.conversation || inner?.extendedTextMessage?.text || '';
            }
            return { text: text.trim(), messageType, media };
        } catch (error) {
            logger.error('Error extracting message content:', error);
            return { text: '', messageType: 'text', media: null };
        }
    }

    normalizePhoneNumber(jid) {
        return normNum(jid);
    }

    isOwner(sender, message, sock) {
        if (!config.ownerNumbers?.length) return false;
        const nums = new Set();
        nums.add(normNum(sender));
        if (message?.key?.participant) nums.add(normNum(message.key.participant));
        if (message?.key?.fromMe && sock?.user?.id) nums.add(normNum(sock.user.id));
        if (message?.key?.remoteJid && !message.key.remoteJid.endsWith('@g.us')) {
            nums.add(normNum(message.key.remoteJid));
        }
        nums.delete('');
        for (const ownerJid of config.ownerNumbers) {
            const ownerNum = normNum(ownerJid);
            if (ownerNum && nums.has(ownerNum)) return true;
        }
        return false;
    }

    isSudo(sender, message, sock) {
        if (this.isOwner(sender, message, sock)) return true;
        if (!sender || !config.sudoers?.length) return false;
        const nums = new Set();
        if (message?.key?.participant) nums.add(normNum(message.key.participant));
        nums.add(normNum(sender));
        nums.delete('');
        for (const sudoJid of config.sudoers) {
            if (nums.has(normNum(sudoJid))) return true;
        }
        return false;
    }

    async startTyping(sock, from) {
        if (!config.autoTyping) return;
        try {
            await sock.sendPresenceUpdate('composing', from);
            if (this.typingIntervals.has(from)) clearInterval(this.typingIntervals.get(from));
            const interval = setInterval(async () => {
                try { await sock.sendPresenceUpdate('composing', from); }
                catch { this.stopTyping(from); }
            }, 10000);
            this.typingIntervals.set(from, interval);
        } catch {}
    }

    stopTyping(from) {
        if (this.typingIntervals.has(from)) {
            clearInterval(this.typingIntervals.get(from));
            this.typingIntervals.delete(from);
        }
    }

    async startRecording(sock, from) {
        if (!config.autoRecording) return;
        try {
            await sock.sendPresenceUpdate('recording', from);
            if (this.recordingIntervals.has(from)) clearInterval(this.recordingIntervals.get(from));
            const interval = setInterval(async () => {
                try { await sock.sendPresenceUpdate('recording', from); }
                catch { this.stopRecording(from); }
            }, 10000);
            this.recordingIntervals.set(from, interval);
        } catch {}
    }

    stopRecording(from) {
        if (this.recordingIntervals.has(from)) {
            clearInterval(this.recordingIntervals.get(from));
            this.recordingIntervals.delete(from);
        }
    }

    async handleIncomingMessage(sock, message) {
        try {
            if (!message?.key) return;

            const from = message.key.remoteJid;
            const fromMe = message.key.fromMe;

            if (!from || from === 'status@broadcast') return;

            let sender;
            if (from.endsWith('@g.us')) {
                sender = message.key.participant || sock.user?.id || from;
            } else if (fromMe) {
                sender = sock.user?.id || from;
            } else {
                sender = from;
            }

            const isOwnerUser = this.isOwner(sender, message, sock);
            const isSudoUser = this.isSudo(sender, message, sock);

            if (config.autoRead && !fromMe) {
                try { await sock.readMessages([message.key]); } catch {}
            }

            const stanzaId = resolveStanzaId(message);

            const replyHandler = findReplyHandler(stanzaId);
            const chatHandler = !from.endsWith('@g.us') ? findChatHandler(from) : null;
            const hasActiveHandler = !!(replyHandler || chatHandler);

            if (fromMe && !config.selfMode && !isOwnerUser && !isSudoUser && !hasActiveHandler) {
                return;
            }

            if (from.endsWith('@g.us') && !fromMe) {
                try { if (await checkBan(sock, message)) return; } catch {}
                try { if (await checkSpam(sock, message)) return; } catch {}
                try { if (await checkAntilink(sock, message)) return; } catch {}
                try { if (await checkBadWord(sock, message)) return; } catch {}
            }

            const messageContent = this.extractMessageContent(message);
            if (!messageContent) return;

            const text = messageContent.text;

            if (!isOwnerUser && !isSudoUser && this.isSpamming(sender)) return;

            const handleAutoDownload = await getAutoDownload();
            const autoHandled = await handleAutoDownload(sock, message, from, sender, text);
            if (autoHandled) return;

            if (replyHandler && typeof replyHandler.handler === 'function') {
                try { await replyHandler.handler(text, message); return; }
                catch (error) { logger.error('Reply handler error:', error); }
            }

            if (!stanzaId && chatHandler && typeof chatHandler.handler === 'function') {
                const isPrefixedMsg = text.startsWith(config.prefix);
                if (!isPrefixedMsg) {
                    try { await chatHandler.handler(text, message); return; }
                    catch (error) { logger.error('Chat handler error:', error); }
                }
            }

            if (!text?.length) return;

            if (config.whitelist?.enabled && !isOwnerUser && !isSudoUser) return;

            const ownerNoPrefix = config.ownerNoPrefix && (isOwnerUser || isSudoUser);
            const isPrefixed = text.startsWith(config.prefix);

            if (!isPrefixed && !ownerNoPrefix) return;

            if (config.autoTyping) {
                await this.startTyping(sock, from);
            } else if (config.autoRecording) {
                await this.startRecording(sock, from);
            }

            const commandHandler = await this.initializeCommandHandler();
            if (!commandHandler) {
                this.stopTyping(from);
                this.stopRecording(from);
                return;
            }

            const commandText = ownerNoPrefix && !isPrefixed
                ? text.trim()
                : text.slice(config.prefix.length).trim();

            if (!commandText?.length) {
                this.stopTyping(from);
                this.stopRecording(from);
                return;
            }

            const args = commandText.split(/\s+/);
            const commandName = args.shift()?.toLowerCase();

            if (!commandName) {
                this.stopTyping(from);
                this.stopRecording(from);
                return;
            }

            const command = commandHandler.getCommand(commandName);

            if (!command) {
                this.stopTyping(from);
                this.stopRecording(from);
                if (isPrefixed) {
                    const suggestions = commandHandler.searchCommands(commandName);
                    let response = `Command "${commandName}" not found.`;
                    if (suggestions?.length > 0) {
                        response += `\n\nDid you mean:\n${suggestions.slice(0, 3).map(c => `${config.prefix}${c.name}`).join('\n')}`;
                    }
                    response += `\n\nType ${config.prefix}help for all commands`;
                    await sock.sendMessage(from, { text: response }, { quoted: message });
                }
                return;
            }

            try {
                await commandHandler.handleCommand(sock, message, commandName, args);
            } catch (error) {
                logger.error(`Command ${commandName} failed:`, error);
                await sock.sendMessage(from, {
                    text: `❌ Error executing ${commandName}: ${error.message}`
                }, { quoted: message });
            } finally {
                this.stopTyping(from);
                this.stopRecording(from);
                try { await sock.sendPresenceUpdate('available', from); } catch {}
            }

        } catch (error) {
            logger.error('Message handling error:', error);
            if (message?.key?.remoteJid) {
                this.stopTyping(message.key.remoteJid);
                this.stopRecording(message.key.remoteJid);
            }
        }
    }

    async handleMessageUpdate(sock, messageUpdates) {
        for (const update of messageUpdates) {
            try {
                logger.debug(`Message updated: ${update.key?.id}`);
            } catch (error) {
                logger.error('Message update error:', error);
            }
        }
    }

    async handleMessageDelete(sock, deletedMessages) {
        for (const deletion of deletedMessages) {
            try {
                logger.debug(`Message deleted: ${deletion.id} from ${deletion.remoteJid}`);
            } catch (error) {
                logger.error('Message deletion error:', error);
            }
        }
    }

    async getMessageStats() {
        try {
            return await cache.get('messageStats') || {
                totalMessages: 0, commandsExecuted: 0,
                mediaProcessed: 0, groupMessages: 0, privateMessages: 0
            };
        } catch {
            return { totalMessages: 0, commandsExecuted: 0, mediaProcessed: 0, groupMessages: 0, privateMessages: 0 };
        }
    }
}

export const messageHandler = new MessageHandler();

export default {
    messageHandler,
    handleIncomingMessage: (sock, message) => messageHandler.handleIncomingMessage(sock, message),
    handleMessageUpdate: (sock, updates) => messageHandler.handleMessageUpdate(sock, updates),
    handleMessageDelete: (sock, deletions) => messageHandler.handleMessageDelete(sock, deletions),
    getMessageStats: () => messageHandler.getMessageStats(),
    extractMessageContent: (message) => messageHandler.extractMessageContent(message)
};
