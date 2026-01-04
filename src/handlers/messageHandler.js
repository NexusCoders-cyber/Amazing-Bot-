import config from '../config.js';
import logger from '../utils/logger.js';
import { cache } from '../utils/cache.js';
import { handleAutoDownload } from '../commands/media/autolink.js';

class MessageHandler {
    constructor() {
        this.commandHandler = null;
        this.isReady = false;
        this.typingIntervals = new Map();
        this.recordingIntervals = new Map();
    }

    async initializeCommandHandler() {
        if (this.commandHandler && this.isReady) {
            return this.commandHandler;
        }

        try {
            const commandHandlerModule = await import('./commandHandler.js');
            this.commandHandler = commandHandlerModule.commandHandler;
            
            if (!this.commandHandler.isInitialized) {
                await this.commandHandler.initialize();
            }
            
            this.isReady = true;
            logger.info('Message handler ready to process commands');
            return this.commandHandler;
        } catch (error) {
            logger.error('Failed to initialize command handler:', error);
            throw error;
        }
    }

    extractMessageContent(message) {
        if (!message || !message.message) {
            return null;
        }

        const msg = message.message;
        let text = '';
        let messageType = 'text';
        let media = null;
        let quoted = null;

        try {
            if (msg.conversation) {
                text = msg.conversation;
            } else if (msg.extendedTextMessage) {
                text = msg.extendedTextMessage.text || '';
                quoted = msg.extendedTextMessage.contextInfo?.quotedMessage;
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
            } else {
                return null;
            }

            return { 
                text: text.trim(), 
                messageType, 
                media, 
                quoted 
            };
        } catch (error) {
            logger.error('Error extracting message content:', error);
            return null;
        }
    }

    normalizePhoneNumber(jid) {
        if (!jid) return '';
        let cleaned = String(jid);
        cleaned = cleaned.replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '');
        cleaned = cleaned.split(':')[0];
        cleaned = cleaned.split('@')[0];
        cleaned = cleaned.replace(/[^0-9]/g, '');
        return cleaned;
    }

    extractAllPossibleNumbers(message, sock) {
        const numbers = new Set();
        
        try {
            if (message.key.participant) {
                const num = this.normalizePhoneNumber(message.key.participant);
                if (num && num.length >= 10) numbers.add(num);
            }
            
            if (message.key.remoteJid && !message.key.remoteJid.endsWith('@g.us')) {
                const num = this.normalizePhoneNumber(message.key.remoteJid);
                if (num && num.length >= 10) numbers.add(num);
            }
            
            if (message.key.fromMe && sock.user && sock.user.id) {
                const num = this.normalizePhoneNumber(sock.user.id);
                if (num && num.length >= 10) numbers.add(num);
            }
            
            if (message.participant) {
                const num = this.normalizePhoneNumber(message.participant);
                if (num && num.length >= 10) numbers.add(num);
            }

            if (message.key && message.key.id) {
                const parts = message.key.id.split('_');
                if (parts.length > 0) {
                    const num = this.normalizePhoneNumber(parts[0]);
                    if (num && num.length >= 10) numbers.add(num);
                }
            }
        } catch (error) {
            logger.error('Error extracting numbers:', error);
        }
        
        return Array.from(numbers);
    }

    isOwner(sender, message, sock) {
        if (!sender) return false;
        
        const possibleNumbers = new Set();
        
        if (message && sock) {
            const allNums = this.extractAllPossibleNumbers(message, sock);
            allNums.forEach(n => possibleNumbers.add(n));
        }
        
        possibleNumbers.add(this.normalizePhoneNumber(sender));
        
        if (message && message.key && message.key.fromMe && sock && sock.user && sock.user.id) {
            possibleNumbers.add(this.normalizePhoneNumber(sock.user.id));
        }
        
        if (config.ownerNumbers && Array.isArray(config.ownerNumbers)) {
            for (const ownerJid of config.ownerNumbers) {
                const ownerNumber = this.normalizePhoneNumber(ownerJid);
                for (const userNumber of possibleNumbers) {
                    if (userNumber === ownerNumber) {
                        logger.debug(`Owner match found: ${userNumber} = ${ownerNumber}`);
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    isSudo(sender, message, sock) {
        if (!sender) return false;
        if (this.isOwner(sender, message, sock)) return true;
        
        const possibleNumbers = new Set();
        
        if (message && sock) {
            const allNums = this.extractAllPossibleNumbers(message, sock);
            allNums.forEach(n => possibleNumbers.add(n));
        }
        
        possibleNumbers.add(this.normalizePhoneNumber(sender));
        
        if (message && message.key && message.key.fromMe && sock && sock.user && sock.user.id) {
            possibleNumbers.add(this.normalizePhoneNumber(sock.user.id));
        }
        
        if (config.sudoers && Array.isArray(config.sudoers)) {
            for (const sudoJid of config.sudoers) {
                const sudoNumber = this.normalizePhoneNumber(sudoJid);
                for (const userNumber of possibleNumbers) {
                    if (userNumber === sudoNumber) {
                        logger.debug(`Sudo match found: ${userNumber} = ${sudoNumber}`);
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    async startTyping(sock, from) {
        if (!config.autoTyping) return;
        
        try {
            await sock.sendPresenceUpdate('composing', from);
            
            if (this.typingIntervals.has(from)) {
                clearInterval(this.typingIntervals.get(from));
            }
            
            const interval = setInterval(async () => {
                try {
                    await sock.sendPresenceUpdate('composing', from);
                } catch (e) {
                    this.stopTyping(from);
                }
            }, 10000);
            
            this.typingIntervals.set(from, interval);
        } catch (error) {
            logger.error('Error starting typing:', error);
        }
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
            
            if (this.recordingIntervals.has(from)) {
                clearInterval(this.recordingIntervals.get(from));
            }
            
            const interval = setInterval(async () => {
                try {
                    await sock.sendPresenceUpdate('recording', from);
                } catch (e) {
                    this.stopRecording(from);
                }
            }, 10000);
            
            this.recordingIntervals.set(from, interval);
        } catch (error) {
            logger.error('Error starting recording:', error);
        }
    }

    stopRecording(from) {
        if (this.recordingIntervals.has(from)) {
            clearInterval(this.recordingIntervals.get(from));
            this.recordingIntervals.delete(from);
        }
    }

    async setPresenceAvailable(sock, from) {
        try {
            await sock.sendPresenceUpdate('available', from);
        } catch (error) {
            logger.error('Error setting presence:', error);
        }
    }

    async handleIncomingMessage(sock, message) {
        try {
            if (!message || !message.key) {
                return;
            }
            
            const from = message.key.remoteJid;
            const fromMe = message.key.fromMe;
            
            if (config.autoRead && !fromMe) {
                try {
                    await sock.readMessages([message.key]);
                } catch (e) {}
            }
            
            if (fromMe) {
                if (!config.selfMode) {
                    const isBotOwner = this.isOwner(sock.user?.id, message, sock);
                    if (!isBotOwner) {
                        return;
                    }
                }
            }
            
            if (!from || from === 'status@broadcast') {
                return;
            }

            let sender;
            if (message.key.fromMe && sock.user && sock.user.id) {
                sender = sock.user.id;
            } else {
                sender = message.key.participant || from;
            }
            const isGroup = from.endsWith('@g.us');

            const messageContent = this.extractMessageContent(message);
            if (!messageContent) {
                return;
            }

            const text = messageContent.text;
            const autoDownloadHandled = await handleAutoDownload(sock, message, from, sender, text);
            if (autoDownloadHandled) {
                return;
            }
            
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo;
            
            if (quotedMsg && quotedMsg.stanzaId) {
                if (global.replyHandlers && global.replyHandlers[quotedMsg.stanzaId]) {
                    const replyHandler = global.replyHandlers[quotedMsg.stanzaId];
                    
                    if (typeof replyHandler.handler === 'function') {
                        try {
                            await replyHandler.handler(text, message);
                            return;
                        } catch (error) {
                            logger.error('Reply handler error:', error);
                        }
                    }
                }
            }
            
            if (!text || text.length === 0) {
                return;
            }

            const isOwnerUser = this.isOwner(sender, message, sock);
            const isSudoUser = this.isSudo(sender, message, sock);
            
            const allNumbers = this.extractAllPossibleNumbers(message, sock);
            logger.info(`MESSAGE | From: ${sender.split('@')[0]} | ${isGroup ? 'GROUP' : 'PRIVATE'} | Owner: ${isOwnerUser} | Sudo: ${isSudoUser} | AllNumbers: [${allNumbers.join(', ')}] | Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

            if (config.whitelist && config.whitelist.enabled) {
                if (!isOwnerUser && !isSudoUser) {
                    logger.info(`Blocked by whitelist: ${sender.split('@')[0]}`);
                    return;
                }
            }

            const ownerNoPrefix = config.ownerNoPrefix && (isOwnerUser || isSudoUser);
            const isPrefixed = text.startsWith(config.prefix);
            
            if (!isPrefixed && !ownerNoPrefix) {
                return;
            }

            if (config.autoTyping) {
                await this.startTyping(sock, from);
            } else if (config.autoRecording) {
                await this.startRecording(sock, from);
            }

            const commandHandler = await this.initializeCommandHandler();
            if (!commandHandler) {
                logger.error('Command handler not initialized');
                this.stopTyping(from);
                this.stopRecording(from);
                return;
            }

            let commandText;
            if (ownerNoPrefix && !isPrefixed) {
                commandText = text.trim();
            } else {
                commandText = text.slice(config.prefix.length).trim();
            }
            
            if (!commandText || commandText.length === 0) {
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
                    let response = `❌ Command "${commandName}" not found.\n`;
                    
                    if (suggestions && suggestions.length > 0) {
                        response += `\n💡 Did you mean:\n`;
                        suggestions.slice(0, 3).forEach(cmd => {
                            response += `  • ${config.prefix}${cmd.name}\n`;
                        });
                    }
                    
                    response += `\nType ${config.prefix}help for all commands`;
                    
                    await sock.sendMessage(from, { text: response }, { quoted: message });
                }
                return;
            }

            logger.info(`EXECUTING: ${commandName} | User: ${sender.split('@')[0]} | Args: [${args.join(', ')}]`);
            
            try {
                await commandHandler.handleCommand(sock, message, commandName, args);
                logger.info(`Command ${commandName} executed successfully`);
            } catch (error) {
                logger.error(`Command ${commandName} failed:`, error);
                await sock.sendMessage(from, {
                    text: `❌ Error executing ${commandName}: ${error.message}`
                }, { quoted: message });
            } finally {
                this.stopTyping(from);
                this.stopRecording(from);
                await this.setPresenceAvailable(sock, from);
            }

        } catch (error) {
            logger.error('Message handling error:', error);
            if (message && message.key && message.key.remoteJid) {
                this.stopTyping(message.key.remoteJid);
                this.stopRecording(message.key.remoteJid);
            }
        }
    }

    async handleMessageUpdate(sock, messageUpdates) {
        for (const update of messageUpdates) {
            try {
                const { key, update: messageUpdate } = update;
                if (messageUpdate && messageUpdate.message && key && key.id) {
                    logger.info(`Message updated: ${key.id}`);
                }
            } catch (error) {
                logger.error('Message update error:', error);
            }
        }
    }

    async handleMessageDelete(sock, deletedMessages) {
        for (const deletion of deletedMessages) {
            try {
                const { id, remoteJid } = deletion;
                logger.info(`Message deleted: ${id} from ${remoteJid}`);
            } catch (error) {
                logger.error('Message deletion error:', error);
            }
        }
    }

    async getMessageStats() {
        try {
            let stats = await cache.get('messageStats');
            if (!stats) {
                stats = {
                    totalMessages: 0,
                    commandsExecuted: 0,
                    mediaProcessed: 0,
                    groupMessages: 0,
                    privateMessages: 0
                };
            }
            return stats;
        } catch (error) {
            return {
                totalMessages: 0,
                commandsExecuted: 0,
                mediaProcessed: 0,
                groupMessages: 0,
                privateMessages: 0
            };
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