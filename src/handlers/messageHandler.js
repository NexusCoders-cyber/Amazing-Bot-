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

    const ctx =
        m.extendedTextMessage?.contextInfo ||
        m.imageMessage?.contextInfo ||
        m.videoMessage?.contextInfo ||
        m.audioMessage?.contextInfo ||
        m.documentMessage?.contextInfo ||
        m.stickerMessage?.contextInfo ||
        m.ephemeralMessage?.message?.extendedTextMessage?.contextInfo ||
        m.viewOnceMessage?.message?.imageMessage?.contextInfo ||
        m.viewOnceMessage?.message?.videoMessage?.contextInfo ||
        null;

    return ctx?.stanzaId || null;
}

function isLid(jid) {
    if (!jid) return false;
    return String(jid).endsWith('@lid');
}

function stripJid(jid) {
    if (!jid) return '';
    if (isLid(jid)) return '';
    return String(jid)
        .replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast/g, '')
        .split(':')[0]
        .replace(/[^0-9]/g, '');
}

function getBotPhone(sock) {
    const candidates = [sock.user?.id, sock.authState?.creds?.me?.id];
    for (const c of candidates) {
        if (!c || isLid(c)) continue;
        const n = stripJid(c);
        if (n) return n;
    }
    return '';
}

function getBotLid(sock) {
    const candidates = [sock.user?.lid, sock.authState?.creds?.me?.lid];
    for (const c of candidates) {
        if (!c) continue;
        return String(c).split('@')[0].split(':')[0];
    }
    return '';
}

function findParticipantInList(participants, jid) {
    if (!jid || !participants?.length) return null;
    const jidStr = String(jid);
    const phoneNum = isLid(jidStr) ? '' : stripJid(jidStr);
    const lidNum = jidStr.split('@')[0].split(':')[0];

    for (const p of participants) {
        const pStr = String(p.id || '');
        const pPhone = isLid(pStr) ? '' : stripJid(pStr);
        const pLid = pStr.split('@')[0].split(':')[0];

        if (phoneNum && pPhone && phoneNum === pPhone) return p;
        if (lidNum && pLid && lidNum === pLid) return p;
    }
    return null;
}

async function resolveSenderPhone(sock, groupJid, rawParticipant) {
    if (!rawParticipant) return '';
    if (!isLid(rawParticipant)) {
        const n = stripJid(rawParticipant);
        if (n && n.length >= 7) return n;
    }
    try {
        const meta = await sock.groupMetadata(groupJid);
        if (meta?.participants) {
            const found = findParticipantInList(meta.participants, rawParticipant);
            if (found) {
                const fStr = String(found.id || '');
                if (!isLid(fStr)) {
                    const n = stripJid(fStr);
                    if (n && n.length >= 7) return n;
                }
            }
        }
    } catch {}
    return '';
}

function resolvePrivateSenderPhone(sock, fromMe, remoteJid, userJid) {
    if (fromMe) {
        return getBotPhone(sock);
    }
    if (userJid && !isLid(userJid)) {
        const n = stripJid(userJid);
        if (n && n.length >= 7) return n;
    }
    if (remoteJid && !isLid(remoteJid)) {
        const n = stripJid(remoteJid);
        if (n && n.length >= 7) return n;
    }
    return '';
}

function isOwner(senderPhone, message, sock) {
    if (!config.ownerNumbers?.length) return false;
    const nums = new Set();
    if (senderPhone && senderPhone.length >= 7) nums.add(senderPhone);
    if (message?.key?.fromMe) {
        const botNum = getBotPhone(sock);
        if (botNum) nums.add(botNum);
    }
    if (message?.key?.remoteJid && !message.key.remoteJid.endsWith('@g.us')) {
        const jid = message.key.remoteJid;
        if (!isLid(jid)) {
            const n = stripJid(jid);
            if (n && n.length >= 7) nums.add(n);
        }
    }
    for (const ownerJid of config.ownerNumbers) {
        const ownerNum = stripJid(ownerJid);
        if (ownerNum && nums.has(ownerNum)) return true;
    }
    return false;
}

function isSudo(senderPhone, message, sock) {
    if (isOwner(senderPhone, message, sock)) return true;
    if (!senderPhone || !config.sudoers?.length) return false;
    for (const sudoJid of config.sudoers) {
        if (senderPhone === stripJid(sudoJid)) return true;
    }
    return false;
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

    isSpamming(senderPhone) {
        if (!config.antiSpam?.enabled) return false;
        const maxMessages = config.antiSpam?.maxMessages || 10;
        const windowMs = config.antiSpam?.windowMs || 10000;
        const now = Date.now();
        if (!this.spamTracker.has(senderPhone)) {
            this.spamTracker.set(senderPhone, { count: 1, windowStart: now });
            return false;
        }
        const data = this.spamTracker.get(senderPhone);
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

            const isGroup = from.endsWith('@g.us');

            let rawParticipant = '';
            let senderPhone = '';

            if (isGroup) {
                rawParticipant = message.key.participant || '';
                senderPhone = await resolveSenderPhone(sock, from, rawParticipant);
            } else {
                rawParticipant = fromMe ? (sock.user?.id || '') : from;
                senderPhone = resolvePrivateSenderPhone(sock, fromMe, from, rawParticipant);
            }

            const senderJid = senderPhone ? senderPhone + '@s.whatsapp.net' : (rawParticipant || from);

            const isOwnerUser = isOwner(senderPhone, message, sock);
            const isSudoUser = isSudo(senderPhone, message, sock);

            if (config.autoRead && !fromMe) {
                try { await sock.readMessages([message.key]); } catch {}
            }

            const stanzaId = resolveStanzaId(message);
            const replyHandler = findReplyHandler(stanzaId);
            const chatHandler = !isGroup ? findChatHandler(from) : null;
            const hasActiveHandler = !!(replyHandler || chatHandler);

            if (fromMe && !config.selfMode && !isOwnerUser && !isSudoUser && !hasActiveHandler) {
                return;
            }

            if (isGroup && !fromMe) {
                try { if (await checkBan(sock, message)) return; } catch {}
                try { if (await checkSpam(sock, message)) return; } catch {}
                try { if (await checkAntilink(sock, message)) return; } catch {}
                try { if (await checkBadWord(sock, message)) return; } catch {}
            }

            const messageContent = this.extractMessageContent(message);
            if (!messageContent) return;

            const text = messageContent.text;

            if (!isOwnerUser && !isSudoUser && senderPhone && this.isSpamming(senderPhone)) return;

            const handleAutoDownload = await getAutoDownload();
            const autoHandled = await handleAutoDownload(sock, message, from, senderJid, text);
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

            const commandHandler = await this.initializeCommandHandler();
            if (!commandHandler) return;

            if (!isPrefixed && !ownerNoPrefix) {
                const rawArgs = text.trim().split(/\s+/);
                const rawName = rawArgs[0]?.toLowerCase();
                if (rawName) {
                    const cmd = commandHandler.getCommand(rawName);
                    if (cmd?.noPrefix === true) {
                        if (config.autoTyping) await this.startTyping(sock, from);
                        try {
                            await commandHandler.handleCommand(sock, message, rawName, rawArgs.slice(1));
                        } catch (error) {
                            logger.error(`No-prefix command ${rawName} failed:`, error);
                        } finally {
                            this.stopTyping(from);
                            this.stopRecording(from);
                            try { await sock.sendPresenceUpdate('available', from); } catch {}
                        }
                    }
                }
                return;
            }

            if (config.autoTyping) {
                await this.startTyping(sock, from);
            } else if (config.autoRecording) {
                await this.startRecording(sock, from);
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
