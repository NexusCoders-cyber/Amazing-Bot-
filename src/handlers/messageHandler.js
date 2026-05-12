import config from '../config.js';
import logger from '../utils/logger.js';
import { cache } from '../utils/cache.js';
import { checkAntilink } from '../commands/admin/antilink.js';
import { checkBan } from '../commands/admin/ban.js';
import { checkSpam } from '../commands/admin/antispam.js';
import { checkBadWord } from '../commands/admin/antiword.js';
import { checkGay } from '../commands/admin/antigay.js';
import { checkSticker } from '../commands/admin/antisticker.js';
import { isSuspended } from '../utils/suspendStore.js';
import { getSessionControl, isOwnerForSession, isSudoForSession } from '../utils/sessionControl.js';
import { isTopOwner } from '../utils/privilegedUsers.js';
import { initWhitelist, isWhitelisted } from '../commands/owner/whitelist.js';
import { getAntiHijackConfig } from '../utils/antihijackStore.js';
import { getAntiBotConfig, incrementBotWarning, resetBotWarning } from '../utils/antibotStore.js';
import { getWatchConfig, resolvePersonalTarget, shouldPassScope } from '../utils/messageWatchStore.js';
import { isAntiGmEnabled } from '../commands/admin/antigm.js';
import { getAutoStatusConfig } from '../commands/admin/autostatus.js';
import { getAutomationConfig } from '../utils/automationStore.js';
import { getStickerActionByHash, getStickerHashFromMessage } from '../utils/stickerVault.js';
import { getStickerCmdByFingerprint } from '../services/databaseService.js';
import { getStickerFingerprint } from '../commands/owner/setcmd.js';

let autoDownloadHandler = null;
const MESSAGE_AUDIT_CACHE_LIMIT = 2000;

function getMessageAuditCache() {
    if (!global.messageAuditCache) global.messageAuditCache = new Map();
    return global.messageAuditCache;
}

function cacheIncomingMessage(message, text = '') {
    const key = message?.key;
    if (!key?.id || !key?.remoteJid) return;
    const cache = getMessageAuditCache();
    const msg = message?.message || {};
    const mediaType = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].find((k) => !!msg[k]) || null;
    cache.set(key.id, {
        id: key.id,
        chatId: key.remoteJid,
        participant: key.participant || key.remoteJid,
        text: text || '',
        mediaType,
        mediaUrl: msg?.imageMessage?.url || msg?.videoMessage?.url || msg?.documentMessage?.url || msg?.audioMessage?.url || null,
        ts: Date.now()
    });
    if (cache.size > MESSAGE_AUDIT_CACHE_LIMIT) {
        const old = cache.keys().next().value;
        if (old) cache.delete(old);
    }
}

function getDestinationChatId(configObj, originChatId, appConfig) {
    if (configObj.destination === 'g') return originChatId;
    if (configObj.destination === 'jid' && configObj.targetJid) return configObj.targetJid;
    return resolvePersonalTarget(appConfig);
}

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

    const inner = m.ephemeralMessage?.message
        || m.viewOnceMessage?.message
        || m.viewOnceMessageV2?.message
        || m.viewOnceMessageV2Extension?.message
        || m.editedMessage?.message
        || null;

    const ctx =
        m.extendedTextMessage?.contextInfo ||
        m.imageMessage?.contextInfo ||
        m.videoMessage?.contextInfo ||
        m.audioMessage?.contextInfo ||
        m.documentMessage?.contextInfo ||
        m.stickerMessage?.contextInfo ||
        m.buttonsResponseMessage?.contextInfo ||
        m.listResponseMessage?.contextInfo ||
        inner?.extendedTextMessage?.contextInfo ||
        inner?.imageMessage?.contextInfo ||
        inner?.videoMessage?.contextInfo ||
        inner?.documentMessage?.contextInfo ||
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

function collectPhoneCandidatesFromMessage(message = {}) {
    const candidates = new Set();
    const key = message?.key || {};
    const msg = message?.message || {};
    const ctx = msg?.extendedTextMessage?.contextInfo
        || msg?.imageMessage?.contextInfo
        || msg?.videoMessage?.contextInfo
        || msg?.documentMessage?.contextInfo
        || msg?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo
        || {};

    const jidValues = [
        key?.remoteJid,
        key?.participant,
        key?.participantAlt,
        key?.participantPn,
        ctx?.participant,
        ctx?.remoteJid
    ];
    for (const v of jidValues) {
        const n = stripJid(v);
        if (n && n.length >= 7) candidates.add(n);
    }
    return [...candidates];
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

async function isOwner(senderPhone, message, sock) {
    const nums = new Set();
    if (senderPhone && senderPhone.length >= 7) nums.add(senderPhone);
    for (const n of collectPhoneCandidatesFromMessage(message)) nums.add(n);
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
    for (const n of nums) {
        if (isTopOwner(n)) return true;
        if (await isOwnerForSession(sock, n)) return true;
    }
    return false;
}

async function isSudo(senderPhone, message, sock) {
    if (await isOwner(senderPhone, message, sock)) return true;
    const nums = new Set();
    if (senderPhone && senderPhone.length >= 7) nums.add(senderPhone);
    for (const n of collectPhoneCandidatesFromMessage(message)) nums.add(n);
    if (message?.key?.remoteJid && !message.key.remoteJid.endsWith('@g.us')) {
        const jid = message.key.remoteJid;
        if (!isLid(jid)) {
            const n = stripJid(jid);
            if (n && n.length >= 7) nums.add(n);
        }
    }
    for (const n of nums) {
        if (await isSudoForSession(sock, n)) return true;
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
    return global.chatHandlers[chatJid] || global.chatHandlers['*'] || null;
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


function normalizeJidRaw(jid = '') {
    return String(jid || '').split(':')[0];
}

function isSuperAdminParticipant(meta, jid = '') {
    const clean = normalizeJidRaw(jid);
    const part = (meta?.participants || []).find((p) => normalizeJidRaw(p.id) === clean);
    return part?.admin === 'superadmin';
}

async function enforceOwnerOnlyAdmin(sock, groupId, ownerJid) {
    if (!ownerJid) return;
    const meta = await sock.groupMetadata(groupId).catch(() => null);
    if (!meta) return;
    const ownerClean = normalizeJidRaw(ownerJid);
    if (!isSuperAdminParticipant(meta, ownerClean)) return;

    const botId = normalizeJidRaw(sock?.user?.id || '');
    const demote = (meta.participants || [])
        .filter((p) => p.admin)
        .filter((p) => normalizeJidRaw(p.id) !== ownerClean)
        .filter((p) => normalizeJidRaw(p.id) !== botId)
        .filter((p) => p.admin !== 'superadmin')
        .map((p) => p.id);

    for (let i = 0; i < demote.length; i += 10) {
        const chunk = demote.slice(i, i + 10);
        if (chunk.length) await sock.groupParticipantsUpdate(groupId, chunk, 'demote').catch(() => {});
    }
}

function extractCommandToken(text = '') {
    const trimmed = String(text || '').trim();
    const m = trimmed.match(/^([.!/#$])([a-z0-9_-]+)/i);
    return m ? m[2].toLowerCase() : '';
}

function isSuspiciousBotCommand(text = '') {
    const cmd = extractCommandToken(text);
    if (!cmd) return false;
    const blocked = new Set([
        'bug', 'crashgc', 'hijacked', 'xcrash', 'docubug', 'blank', 'freeze', 'killgc', 'spamcrash', 'invisbug'
    ]);
    return blocked.has(cmd);
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

            if (!from) return;

            if (from === 'status@broadcast') {
                const autoCfg = getAutomationConfig();
                const autoStatus = getAutoStatusConfig();
                if (!autoStatus?.view && !autoStatus?.like) return;
                try { if (autoCfg.autoStatusView && autoStatus.view) await sock.readMessages([message.key]); } catch {}
                if (autoCfg.autoLikeStatus && autoStatus?.like) {
                    try {
                        await sock.sendMessage('status@broadcast', {
                            react: { key: message.key, text: autoStatus.emoji || '❤️' }
                        });
                    } catch {}
                }
                return;
            }

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

            const isOwnerUser = await isOwner(senderPhone, message, sock);
            const isSudoUser = await isSudo(senderPhone, message, sock);
            const sessionControl = await getSessionControl(sock);

            if (getAutomationConfig().autoRead && !fromMe) {
                try { await sock.readMessages([message.key]); } catch {}
            }

            const stanzaId = resolveStanzaId(message);
            const replyHandler = findReplyHandler(stanzaId);
            const chatHandler = findChatHandler(from);
            const hasActiveHandler = !!(replyHandler || chatHandler);

            // Always allow handling self messages so owner can reply to themselves
            // and interactive reply handlers keep working consistently.

            if (isGroup && !fromMe) {
                try { if (await checkBan(sock, message)) return; } catch {}
                try { if (await checkSpam(sock, message)) return; } catch {}
                try { if (await checkAntilink(sock, message)) return; } catch {}
                try { if (await checkBadWord(sock, message)) return; } catch {}
                try { if (await checkGay(sock, message)) return; } catch {}
                try { if (await checkSticker(sock, message)) return; } catch {}
                try {
                    if (await isSuspended(from, rawParticipant)) {
                        await sock.sendMessage(from, { delete: message.key }).catch(() => {});
                        return;
                    }
                } catch {}
            }

            const messageContent = this.extractMessageContent(message);
            if (!messageContent) return;
            try { await collectSticker(sock, message, from); } catch {}

            if (isGroup && !fromMe && message.message?.stickerMessage) {
                try {
                    const stickerHash = await getStickerHashFromMessage(sock, message);
                    const action = await getStickerActionByHash(from, stickerHash);
                    if (action) {
                        if (action.tagEveryone) {
                            const meta = await sock.groupMetadata(from).catch(() => null);
                            const mentions = (meta?.participants || []).map((p) => p.id);
                            if (mentions.length) {
                                await sock.sendMessage(from, { text: '📣 Sticker alert: tagging everyone.', mentions });
                            }
                        }
                        if (action.suspendedUser) {
                            const { setSuspend, clearSuspend, isSuspended } = await import('../utils/suspendStore.js');
                            const target = action.suspendedUser;
                            const active = await isSuspended(from, target);
                            if (active) {
                                await clearSuspend(from, target);
                                await sock.sendMessage(from, { text: '✅ Sticker unsuspended @'+target.split('@')[0], mentions:[target] });
                            } else {
                                await setSuspend(from, target, Date.now() + (365 * 24 * 60 * 60 * 1000));
                                await sock.sendMessage(from, { text: '⛔ Sticker suspended @'+target.split('@')[0]+' until same sticker is replied again.', mentions:[target] });
                            }
                        }
                    }
                } catch {}
            }

            const text = messageContent.text;
            const hasText = !!(text && text.trim().length);
            cacheIncomingMessage(message, text);

            if (isGroup && !fromMe && hasText && !isOwnerUser && !isSudoUser) {
                if (isAntiGmEnabled(from)) {
                    const ctx = message?.message?.extendedTextMessage?.contextInfo || {};
                    const mentioned = ctx.mentionedJid || [];
                    const remoteJid = ctx.remoteJid || '';
                    const textLower = String(text || '').toLowerCase();
                    // Check all possible status/newsletter mention sources
                    const statusJid = 'status@broadcast';
                    const hasStatusMention = mentioned.some((jid) => String(jid).includes('@newsletter') || String(jid) === statusJid)
                        || remoteJid.includes('@newsletter') || remoteJid === statusJid
                        || textLower.includes('@newsletter') || textLower.includes(statusJid)
                        || /newsletter|status.*broadcast/i.test(textLower);
                    if (hasStatusMention) {
                        await sock.sendMessage(from, { delete: message.key }).catch(() => {});
                        const key = normalizeJidRaw(rawParticipant);
                        if (!global.antiGmWarns) global.antiGmWarns = new Map();
                        const chatKey = from + '::' + key;
                        const warns = (global.antiGmWarns.get(chatKey) || 0) + 1;
                        global.antiGmWarns.set(chatKey, warns);
                        if (warns >= 3) {
                            await sock.groupParticipantsUpdate(from, [rawParticipant], 'remove').catch(() => {});
                            global.antiGmWarns.delete(chatKey);
                            await sock.sendMessage(from, { text: '🚫 @'+key.split('@')[0]+' kicked after 3 AntiGM warnings.', mentions:[rawParticipant] }, { quoted: message });
                            return;
                        }
                        await sock.sendMessage(from, { text: '⚠️ AntiGM warning '+warns+'/3 for @'+key.split('@')[0]+'. Do not tag status/newsletter.', mentions:[rawParticipant] }, { quoted: message });
                        return;
                    }
                }
                const antiHijack = await getAntiHijackConfig(from).catch(() => ({ enabled: false }));
                if (antiHijack?.enabled && /(\bhijacked\b|\bbug\b|\bcrashgc\b)/i.test(text)) {
                    await sock.groupParticipantsUpdate(from, [rawParticipant], 'remove').catch(() => {});
                    await sock.sendMessage(from, {
                        text: `🚫 @${normalizeJidRaw(rawParticipant).split('@')[0]} removed by AntiHijack.`,
                        mentions: [rawParticipant]
                    }, { quoted: message });
                    await enforceOwnerOnlyAdmin(sock, from, antiHijack.ownerJid).catch(() => {});
                    return;
                }

                const antiBot = await getAntiBotConfig(from).catch(() => ({ enabled: false, warnings: {} }));
                if (antiBot?.enabled && isSuspiciousBotCommand(text)) {
                    const warns = await incrementBotWarning(from, normalizeJidRaw(rawParticipant));
                    if (warns > 3) {
                        await sock.groupParticipantsUpdate(from, [rawParticipant], 'remove').catch(() => {});
                        await resetBotWarning(from, normalizeJidRaw(rawParticipant));
                        await sock.sendMessage(from, {
                            text: `🚫 @${normalizeJidRaw(rawParticipant).split('@')[0]} kicked (AntiBot: exceeded 3 warnings).`,
                            mentions: [rawParticipant]
                        }, { quoted: message });
                        return;
                    }
                    await sock.sendMessage(from, {
                        text: `⚠️ AntiBot warning ${warns}/3 for @${normalizeJidRaw(rawParticipant).split('@')[0]}. Avoid bot/crash commands.`,
                        mentions: [rawParticipant]
                    }, { quoted: message });
                    return;
                }
            }

            if (!isOwnerUser && !isSudoUser && senderPhone && this.isSpamming(senderPhone)) return;

            if (sessionControl.privateMode && !isOwnerUser && !isSudoUser && !fromMe) return;

            const whitelistData = initWhitelist();
            if (whitelistData?.enabled && !isOwnerUser && !isSudoUser && !isWhitelisted(senderJid, whitelistData)) return;

            const handleAutoDownload = await getAutoDownload();
            const autoHandled = await handleAutoDownload(sock, message, from, senderJid, text);
            if (autoHandled) return;

            if (!hasText) return;

            if (replyHandler && typeof replyHandler.handler === 'function') {
                try { await replyHandler.handler(text, message); return; }
                catch (error) { logger.error('Reply handler error:', error); }
            }

            if (chatHandler && typeof chatHandler.handler === 'function') {
                const isPrefixedMsg = text.startsWith(sessionControl.prefix || config.prefix);
                if (!isPrefixedMsg) {
                    try { await chatHandler.handler(text, message); return; }
                    catch (error) { logger.error('Chat handler error:', error); }
                }
            }

            if (!text?.length) return;

            const ownerNoPrefix = config.ownerNoPrefix && (isOwnerUser || isSudoUser);
            const activePrefix = sessionControl.prefix || config.prefix;
            const isPrefixed = text.startsWith(activePrefix);

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
                : text.slice(activePrefix.length).trim();

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
                if (ownerNoPrefix && !isPrefixed && text.trim()) {
                    const ilomCommand = commandHandler.getCommand('ilom');
                    if (ilomCommand?.noPrefix === true) {
                        try {
                            await commandHandler.handleCommand(sock, message, 'ilom', text.trim().split(/\s+/));
                        } catch (error) {
                            logger.error('Owner no-prefix ilom fallback failed:', error);
                        }
                    }
                }
                this.stopTyping(from);
                this.stopRecording(from);
                if (isPrefixed) {
                    const suggestions = commandHandler.searchCommands(commandName);
                    let response = 'Unknown command.';
                    if (suggestions?.length > 0) {
                        response += `\n\nDid you mean:\n${suggestions.slice(0, 3).map(c => `${activePrefix}${c.name}`).join('\n')}`;
                    }
                    response += `\n\nTry ${activePrefix}help`;
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
                const cfg = getWatchConfig('antiedit');
                if (!cfg?.enabled) continue;
                const key = update?.key;
                if (!key?.id || !key?.remoteJid) continue;
                const cache = getMessageAuditCache();
                const prev = cache.get(key.id);
                const editedText = update?.update?.editedMessage?.message?.conversation
                    || update?.update?.editedMessage?.message?.extendedTextMessage?.text
                    || update?.update?.conversation
                    || update?.update?.extendedTextMessage?.text
                    || '';
                if (!editedText || !prev) continue;
                const isGroup = String(key.remoteJid).endsWith('@g.us');
                if (!shouldPassScope(cfg.scopes, isGroup)) continue;
                if (String(prev.text || '').trim() === String(editedText).trim()) continue;

                const dest = getDestinationChatId(cfg, key.remoteJid, config);
                if (!dest) continue;
                const actor = key.participant || prev.participant || key.remoteJid;
                const lines = [
                    '✏️ *ANTI-EDIT ALERT*',
                    `👤 User: @${String(actor).split('@')[0]}`,
                    `📍 Chat: ${key.remoteJid}`,
                    '',
                    `📝 Before: ${prev.text || '[non-text or unavailable]'}`,
                    `🆕 After: ${editedText}`
                ];
                await sock.sendMessage(dest, { text: lines.join('\n'), mentions: [actor] }).catch(() => {});
                prev.text = editedText;
                cache.set(key.id, prev);
            } catch (error) {
                logger.error('Message update error:', error);
            }
        }
    }

    async handleMessageDelete(sock, deletedMessages) {
        for (const deletion of deletedMessages) {
            try {
                logger.debug(`Message deleted: ${deletion.id} from ${deletion.remoteJid}`);
                const cfg = getWatchConfig('antidelete');
                if (!cfg?.enabled) continue;
                const id = deletion?.id || deletion?.key?.id;
                const remoteJid = deletion?.remoteJid || deletion?.key?.remoteJid;
                if (!id || !remoteJid) continue;
                const isGroup = String(remoteJid).endsWith('@g.us');
                if (!shouldPassScope(cfg.scopes, isGroup)) continue;
                const cache = getMessageAuditCache();
                const prev = cache.get(id);
                if (!prev) continue;
                const dest = getDestinationChatId(cfg, remoteJid, config);
                if (!dest) continue;
                const actor = deletion?.participant || deletion?.key?.participant || prev.participant || remoteJid;
                const lines = [
                    '🗑️ *ANTI-DELETE ALERT*',
                    `👤 User: @${String(actor).split('@')[0]}`,
                    `📍 Chat: ${remoteJid}`,
                    '',
                    `📝 Message: ${prev.text || '[media or unavailable text]'}`,
                    prev.mediaType ? `📎 Media type: ${prev.mediaType}` : null
                ].filter(Boolean);
                await sock.sendMessage(dest, { text: lines.join('\n'), mentions: [actor] }).catch(() => {});
                cache.delete(id);
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
