import 'dotenv/config';
import P from 'pino';
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import NodeCache from 'node-cache';
import figlet from 'figlet';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { connectToDatabase } from './src/utils/database.js';
import logger from './src/utils/logger.js';
import { messageHandler } from './src/handlers/messageHandler.js';
import { commandHandler } from './src/handlers/commandHandler.js';
import eventHandler from './src/handlers/eventHandler.js';
import callHandler from './src/handlers/callHandler.js';
import groupHandler from './src/handlers/groupHandler.js';
import errorHandler from './src/handlers/errorHandler.js';
import config from './src/config.js';
import constants from './src/constants.js';
import { loadPlugins, getActiveCount } from './src/utils/pluginManager.js';
import { startScheduler } from './src/utils/scheduler.js';
import { initializeCache } from './src/utils/cache.js';
import { startWebServer } from './src/utils/webServer.js';
import qrService from './src/services/qrService.js';
import Settings from './src/models/Settings.js';

const msgRetryCounterCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });
const app = express();
let sock = null;
let isInitialized = false;
let reconnectAttempts = 0;

const SESSION_PATH = path.join(process.cwd(), 'cache', 'auth_info_baileys');
const MAX_RECONNECT = 3;

async function createDirectoryStructure() {
    const directories = [
        'src/commands/admin', 'src/commands/ai', 'src/commands/downloader',
        'src/commands/economy', 'src/commands/fun', 'src/commands/games',
        'src/commands/general', 'src/commands/media', 'src/commands/owner',
        'src/commands/utility', 'src/handlers', 'src/models', 'src/plugins',
        'src/services', 'src/middleware', 'src/utils', 'src/api/routes',
        'src/events', 'src/locales', 'src/assets/images', 'src/assets/audio',
        'src/assets/fonts', 'src/assets/templates', 'src/database/migrations',
        'src/database/seeds', 'temp/downloads', 'temp/uploads', 'temp/stickers',
        'temp/audio', 'temp/video', 'temp/documents', 'logs', 'session',
        'backups/database', 'backups/session', 'backups/media',
        'media/profile', 'media/stickers', 'media/downloads', 'media/cache'
    ];

    await Promise.all(directories.map(dir => fs.ensureDir(dir)));
}

async function displayStartupBanner() {
    console.clear();

    const banner = figlet.textSync('ILOM BOT', {
        font: 'ANSI Shadow',
        horizontalLayout: 'fitted',
        verticalLayout: 'default'
    });

    const gradient = (await import('gradient-string')).default;
    console.log(gradient.rainbow(banner));
    console.log(chalk.cyan.bold('\nðŸ§  Amazing Bot ðŸ§  v1 created by Ilom'));
    console.log(chalk.green.bold('Powered by Raphael\n'));
    console.log(chalk.yellow('â•'.repeat(65)));
    console.log(chalk.green('ðŸš€ Initializing Ilom WhatsApp Bot System...'));
    console.log(chalk.yellow('â•'.repeat(65)));
}

async function processSessionCredentials() {
    await fs.ensureDir(SESSION_PATH);
    await fs.ensureDir(path.join(SESSION_PATH, 'keys'));

    if (process.env.SESSION_ID && process.env.SESSION_ID.trim() !== '') {
        try {
            const sessionId = process.env.SESSION_ID.trim();
            let sessionData;

            logger.info('ðŸ” Processing session credentials from environment...');

            if (sessionId.startsWith('sypherâ„¢--') || sessionId.startsWith('sypher sypherâ„¢--')) {
                try {
                    logger.info('ðŸ“¥ Detected sypherâ„¢ session format, downloading from server...');
                    const sessdata = sessionId.replace("sypher sypherâ„¢--", "").replace("sypherâ„¢--", "").trim();
                    
                    if (!sessdata || sessdata.length < 10) {
                        throw new Error('Invalid sypher session ID format');
                    }
                    
                    const axios = (await import('axios')).default;
                    const response = await axios.get(`https://existing-madelle-lance-ui-efecfdce.koyeb.app/download/${sessdata}`, { 
                        responseType: 'stream',
                        timeout: 15000
                    });
                    
                    if (response.status === 404) {
                        throw new Error(`File with identifier ${sessdata} not found.`);
                    }
                    
                    await fs.ensureDir(SESSION_PATH);
                    const writer = fs.createWriteStream(path.join(SESSION_PATH, 'creds.json'));
                    response.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', () => {
                            logger.info('âœ… Session credentials downloaded successfully!');
                            resolve();
                        });
                        writer.on('error', (err) => {
                            logger.error('âŒ Failed to download session file:', err);
                            reject(err);
                        });
                    });
                    
                    return true;
                } catch (error) {
                    logger.warn(`âš ï¸ Sypher session download failed: ${error.message}`);
                    logger.info('ðŸ’¡ Falling back to alternative session formats...');
                }
            }

            if (sessionId.startsWith('Ilom~')) {
                const cleanId = sessionId.replace('Ilom~', '');
                sessionData = JSON.parse(Buffer.from(cleanId, 'base64').toString());
                logger.info('âœ… Processed Ilom format session');
            } else if (sessionId.startsWith('{') && sessionId.endsWith('}')) {
                sessionData = JSON.parse(sessionId);
                logger.info('âœ… Processed JSON format session');
            } else {
                try {
                    sessionData = JSON.parse(Buffer.from(sessionId, 'base64').toString());
                    logger.info('âœ… Processed base64 format session');
                } catch {
                    sessionData = JSON.parse(sessionId);
                    logger.info('âœ… Processed direct JSON format session');
                }
            }

            if (sessionData && typeof sessionData === 'object') {
                if (sessionData.creds) {
                    await fs.writeJSON(path.join(SESSION_PATH, 'creds.json'), sessionData.creds, { spaces: 2 });

                    if (sessionData.keys && typeof sessionData.keys === 'object') {
                        const keysPath = path.join(SESSION_PATH, 'keys');
                        await fs.ensureDir(keysPath);

                        for (const [keyName, keyData] of Object.entries(sessionData.keys)) {
                            if (keyData && typeof keyData === 'object') {
                                await fs.writeJSON(path.join(keysPath, `${keyName}.json`), keyData, { spaces: 2 });
                            }
                        }
                        logger.info('âœ… Session credentials and keys processed');
                    } else {
                        logger.info('âœ… Session credentials processed (keys will be generated)');
                    }
                } else {
                    await fs.writeJSON(path.join(SESSION_PATH, 'creds.json'), sessionData, { spaces: 2 });
                    logger.info('âœ… Session credentials processed (legacy format)');
                }
                return true;
            }
        } catch (error) {
            logger.warn('âš ï¸ Invalid SESSION_ID format:', error.message);
        }
    }

    const credsPath = path.join(SESSION_PATH, 'creds.json');

    if (await fs.pathExists(credsPath)) {
        try {
            const creds = await fs.readJSON(credsPath);
            if (creds && (creds.noiseKey || creds.signedIdentityKey)) {
                logger.info('ðŸ“ Using existing session credentials');
                return true;
            } else {
                logger.warn('ðŸ”„ Invalid creds.json found, will regenerate');
                await fs.remove(credsPath);
            }
        } catch (error) {
            logger.warn('ðŸ”„ Corrupted creds.json found, will regenerate');
            await fs.remove(credsPath).catch(() => {});
        }
    }

    logger.info('â„¹ï¸ No valid session found - will generate QR code for pairing');
    return false;
}

async function sendBotStatusUpdate(sock) {
    const startupTime = new Date().toLocaleString('en-US', {
        timeZone: config.timezone || 'UTC',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const statusMessage = `â•­â”€â”€â”€â”€â”€ã€Œ *${config.botName}* ã€â”€â”€â”€â”€â”€â•®
â”‚ âœ… Status: Online & Active
â”‚ ðŸ”¥ Version: ${constants.BOT_VERSION}
â”‚ ðŸ• Started: ${startupTime}
â”‚ ðŸŒ Mode: ${config.publicMode ? 'Public' : 'Private'}
â”‚ ðŸ‘¨â€ðŸ’» Developer: Ilom
â”‚ ðŸŽ¯ Prefix: ${config.prefix}
â”‚ ðŸ“ Commands: ${await commandHandler.getCommandCount()}
â”‚ ðŸ”Œ Plugins: ${getActiveCount()}
â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯

ðŸš€ *${config.botName} is now operational!*
ðŸ“– Type *${config.prefix}help* to view all commands
ðŸ†˜ Type *${config.prefix}menu* for quick navigation`;

    for (const ownerNumber of config.ownerNumbers) {
        try {
            await sock.sendMessage(ownerNumber, {
                text: statusMessage,
                contextInfo: {
                    externalAdReply: {
                        title: config.botName,
                        body: 'Bot Successfully Started!',
                        thumbnailUrl: config.botThumbnail,
                        sourceUrl: config.botRepository,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        } catch (error) {
            logger.error(`Failed to send status to ${ownerNumber}:`, error);
        }
    }
}

async function setupEventHandlers(sock, saveCreds) {
    sock.ev.on('creds.update', () => {
        saveCreds();
    });

    logger.info('âœ… Setting up messages.upsert event handler...');
    
    await messageHandler.initializeCommandHandler();
    
    sock.ev.on('messages.upsert', async (upsert) => {
        const { messages } = upsert;
        
        if (!messages || messages.length === 0) {
            return;
        }

        for (const message of messages) {
            try {
                if (!message || !message.key) {
                    continue;
                }

                const from = message.key.remoteJid;
                const fromMe = message.key.fromMe;
                
                if (!from || from === 'status@broadcast') {
                    continue;
                }

                if (fromMe && !config.selfMode) {
                    continue;
                }

                const hasMessage = message.message && Object.keys(message.message).length > 0;
                
                if (!hasMessage) {
                    continue;
                }

                const messageKeys = Object.keys(message.message);
                const isProtocolOnly = messageKeys.length === 1 && (
                    messageKeys.includes('protocolMessage') || 
                    messageKeys.includes('senderKeyDistributionMessage')
                );

                if (isProtocolOnly) {
                    continue;
                }
                
                logger.debug(`ðŸ“¬ MESSAGE RECEIVED | From: ${from.split('@')[0]} | FromMe: ${fromMe}`);
                
                await messageHandler.handleIncomingMessage(sock, message);
                
            } catch (error) {
                logger.error('Error processing individual message:', error);
            }
        }
    });

    sock.ev.on('messages.update', async (messageUpdates) => {
        if (config.events.messageUpdate) {
            await messageHandler.handleMessageUpdate(sock, messageUpdates);
        }
    });

    sock.ev.on('messages.delete', async (deletedMessages) => {
        if (config.events.messageDelete) {
            await messageHandler.handleMessageDelete(sock, deletedMessages);
        }
    });

    sock.ev.on('messages.reaction', async (reactions) => {
        if (config.events.messageReaction) {
            const handleReaction = (await import('./src/events/messageReaction.js')).default;
            for (const reaction of reactions) {
                await handleReaction(sock, reaction);
            }
        }
    });

    logger.info('âœ… Setting up group-participants.update event handler...');
    sock.ev.on('group-participants.update', async (groupUpdate) => {
        try {
            logger.info(`ðŸ”” GROUP EVENT | Group: ${groupUpdate.id} | Action: ${groupUpdate.action} | Participants: ${groupUpdate.participants?.length || 0}`);
            
            await groupHandler.handleParticipantsUpdate(sock, groupUpdate);
        } catch (error) {
            logger.error('Group participants update error:', error);
        }
    });

    logger.info('âœ… Setting up groups.update event handler...');
    sock.ev.on('groups.update', async (groupsUpdate) => {
        try {
            logger.info(`ðŸ”” GROUPS UPDATE | Count: ${groupsUpdate.length}`);
            
            await groupHandler.handleGroupUpdate(sock, groupsUpdate);
        } catch (error) {
            logger.error('Groups update error:', error);
        }
    });

    sock.ev.on('call', async (callEvents) => {
        await callHandler.handleIncomingCall(sock, callEvents);
    });

    sock.ev.on('contacts.update', async (contactUpdates) => {
        if (config.events.contactUpdate) {
            try {
                await eventHandler.handleContactUpdate(sock, contactUpdates);
            } catch (error) {
                logger.error('Contact update error:', error);
            }
        }
    });
    
    setInterval(() => {
        if (sock && sock.user) {
            sock.sendPresenceUpdate('available').catch(() => {});
        }
    }, 60000);
    
    logger.info('âœ… All event handlers registered successfully');
    logger.info(`ðŸ“‹ Message Handler Status: ${messageHandler.isReady ? 'READY âœ…' : 'NOT READY âŒ'}`);
}

async function establishWhatsAppConnection() {
    return new Promise(async (resolve, reject) => {
        try {
            logger.info('ðŸ“¡ Initializing WhatsApp connection...');
            
            const originalLog = console.log;
            const originalClear = console.clear;
            const originalWrite = process.stdout.write;
            
            console.log = () => {};
            console.clear = () => {};
            process.stdout.write = () => {};
            
            const { makeWASocket, Browsers, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = await import('@whiskeysockets/baileys');
            
            console.log = originalLog;
            console.clear = originalClear;
            process.stdout.write = originalWrite;

            logger.info('ðŸ”‘ Loading authentication state...');
            const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

            logger.info('ðŸ“¦ Fetching latest Baileys version...');
            const { version } = await fetchLatestBaileysVersion();
            logger.info(`âœ… Baileys version: ${version.join('.')}`);

            logger.info('ðŸ”Œ Creating WhatsApp socket...');
            sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: true,
                browser: Browsers.ubuntu("Chrome"),
                markOnlineOnConnect: config.autoOnline,
                syncFullHistory: false,
                defaultQueryTimeoutMs: undefined,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                emitOwnEvents: true,
                fireInitQueries: true,
                generateHighQualityLinkPreview: false,
                logger: P({ level: "silent" }),
                version,
                getMessage: async (key) => {
                    return { conversation: '' };
                }
            });

            logger.info('ðŸ“¢ Setting up connection event handlers...');

            const connectionTimeout = setTimeout(async () => {
                logger.warn('âš ï¸  Connection timeout - WhatsApp connection took too long');
                if (sock && sock.end) {
                    await sock.end();
                }
                if (reconnectAttempts < MAX_RECONNECT) {
                    reconnectAttempts++;
                    setTimeout(() => establishWhatsAppConnection().then(resolve).catch(reject), 5000);
                } else {
                    reject(new Error('Connection timeout after multiple attempts'));
                }
            }, 60000);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    console.log(chalk.cyan('\nðŸ“± QR Code received - scan with WhatsApp to connect'));
                    logger.info('ðŸ“± QR Code generated - Scan with WhatsApp');
                    
                    if (qrService.isQREnabled()) {
                        try {
                            const qrGenerated = await qrService.generateQR(qr);
                            if (qrGenerated) {
                                console.log(chalk.green('âœ… QR code generated and saved'));
                                const domain = process.env.REPLIT_DOMAINS || process.env.REPL_SLUG;
                                if (domain) {
                                    console.log(chalk.blue(`ðŸŒ Access QR code at: https://${domain}/qr`));
                                } else {
                                    console.log(chalk.blue(`ðŸŒ Access QR code at: http://localhost:${config.server.port}/qr`));
                                }
                            }
                        } catch (error) {
                            logger.error('Error generating QR code:', error);
                        }
                    }
                }
                
                if (connection === 'open') {
                    clearTimeout(connectionTimeout);
                    reconnectAttempts = 0;
                    logger.info('âœ… WhatsApp connection established successfully!');
                    console.log(chalk.green.bold('ðŸš€ Bot is online and ready!'));
                    
                    if (qrService.isQREnabled()) {
                        await qrService.clearQR();
                    }
                    
                    await setupEventHandlers(sock, saveCreds);
                    
                    global.sock = sock;
                    
                    logger.info('ðŸŽ¯ Bot is now listening for messages...');
                    console.log(chalk.yellow('ðŸ“¨ Waiting for messages...'));
                    
                    await sendBotStatusUpdate(sock);
                    
                    resolve();
                }
                
                if (connection === 'close') {
                    clearTimeout(connectionTimeout);
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    
                    logger.warn(`âš ï¸  Connection closed. Status code: ${statusCode}`);
                    
                    if (statusCode === DisconnectReason.badSession) {
                        logger.error('âŒ Bad Session File, Please delete session and rescan');
                        setTimeout(() => process.exit(1), 2000);
                    } else if (statusCode === DisconnectReason.connectionClosed) {
                        logger.warn('âš ï¸  Connection closed, reconnecting...');
                        setTimeout(() => establishWhatsAppConnection().then(resolve).catch(reject), 3000);
                    } else if (statusCode === DisconnectReason.connectionLost) {
                        logger.warn('âš ï¸  Connection lost, reconnecting...');
                        setTimeout(() => establishWhatsAppConnection().then(resolve).catch(reject), 3000);
                    } else if (statusCode === DisconnectReason.connectionReplaced) {
                        logger.error('âŒ Connection replaced - Another session opened');
                        setTimeout(() => process.exit(1), 2000);
                    } else if (statusCode === DisconnectReason.loggedOut) {
                        logger.error('âŒ WhatsApp session logged out - Please update SESSION_ID');
                        await fs.remove(SESSION_PATH).catch(() => {});
                        await fs.ensureDir(SESSION_PATH);
                        await fs.ensureDir(path.join(SESSION_PATH, 'keys'));
                        setTimeout(() => process.exit(1), 2000);
                    } else if (statusCode === DisconnectReason.restartRequired) {
                        logger.warn('âš ï¸  Restart required, restarting...');
                        setTimeout(() => establishWhatsAppConnection().then(resolve).catch(reject), 2000);
                    } else if (statusCode === DisconnectReason.timedOut) {
                        logger.warn('âš ï¸  Connection timed out, reconnecting...');
                        setTimeout(() => establishWhatsAppConnection().then(resolve).catch(reject), 3000);
                    } else {
                        logger.warn('âš ï¸  Unknown disconnection, reconnecting...');
                        setTimeout(() => establishWhatsAppConnection().then(resolve).catch(reject), 5000);
                    }
                }
                
                if (update.receivedPendingNotifications) {
                    logger.info('ðŸ“¬ Received pending notifications');
                }
            });

            sock.ev.on('creds.update', saveCreds);

        } catch (error) {
            logger.error('Failed to establish WhatsApp connection:', error);
            if (reconnectAttempts < MAX_RECONNECT) {
                reconnectAttempts++;
                setTimeout(() => establishWhatsAppConnection().then(resolve).catch(reject), 5000);
            } else {
                reject(error);
            }
        }
    });
}

function setupProcessHandlers() {
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Promise Rejection:', reason);
        errorHandler.handleError('unhandledRejection', reason);
    });

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        if (error.message && error.message.includes('Session')) {
            logger.error('Session error detected, restarting...');
            setTimeout(() => process.exit(2), 2000);
        } else {
            errorHandler.handleError('uncaughtException', error);
            setTimeout(() => process.exit(1), 2000);
        }
    });

    process.on('SIGINT', async () => {
        logger.info('Received SIGINT - Graceful shutdown initiated');
        if (sock) {
            try {
                await sock.logout();
            } catch (error) {
                logger.error('Error during logout:', error);
            }
        }
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM - Graceful shutdown initiated');
        if (sock) {
            try {
                await sock.logout();
            } catch (error) {
                logger.error('Error during logout:', error);
            }
        }
        process.exit(0);
    });
}

async function loadSavedSettings() {
    try {
        const mongoose = await import('mongoose');
        
        if (mongoose.default.connection.readyState !== 1) {
            logger.info('â© Skipping settings load (database not connected)');
            return;
        }

        const prefixSetting = await Settings.findOne({ key: 'prefix' }).catch(() => null);

        if (prefixSetting && prefixSetting.value) {
            config.prefix = prefixSetting.value;
            logger.info(`âœ… Loaded saved prefix: ${config.prefix}`);
        }
    } catch (error) {
        logger.warn('Could not load saved settings:', error.message);
    }
}

async function initializeBot() {
    try {
        await displayStartupBanner();
        
        console.log(chalk.cyan('\nâš™ï¸  Configuration Status:'));
        console.log(chalk.gray(`   â”œâ”€ Public Mode: ${chalk.bold(config.publicMode ? chalk.green('âœ“ ENABLED') : chalk.red('âœ— DISABLED'))}`));
        console.log(chalk.gray(`   â”œâ”€ Command Prefix: ${chalk.bold(chalk.yellow(config.prefix))}`));
        console.log(chalk.gray(`   â”œâ”€ Owner Numbers: ${chalk.bold(chalk.cyan(config.ownerNumbers.length + ' configured'))}`));
        console.log(chalk.gray(`   â”œâ”€ Database: ${chalk.bold(config.database.enabled ? chalk.green('âœ“ ENABLED') : chalk.red('âœ— DISABLED'))}`));
        console.log(chalk.gray(`   â””â”€ Session ID: ${chalk.bold(process.env.SESSION_ID ? chalk.green('âœ“ Present') : chalk.yellow('âš  Missing (will generate QR)'))}\n`));

        logger.info('Creating project directory structure...');
        await createDirectoryStructure();

        logger.info('Connecting to database...');
        await connectToDatabase();

        logger.info('Loading saved settings...');
        await loadSavedSettings();

        logger.info('Processing session credentials...');
        await processSessionCredentials();

        logger.info('Initializing cache system...');
        await initializeCache();

        logger.info('Initializing command handler...');
        await commandHandler.initialize();
        logger.info(`âœ… Command handler ready with ${commandHandler.getCommandCount()} commands`);

        logger.info('Loading command modules...');
        await commandHandler.loadCommands();

        logger.info('Loading plugin system...');
        await loadPlugins();

        logger.info('Starting task scheduler...');
        await startScheduler();

        logger.info('Starting web server...');
        await startWebServer(app);

        logger.info('Establishing WhatsApp connection...');
        await establishWhatsAppConnection();

        setupProcessHandlers();

        logger.info('Bot initialization completed successfully');
        console.log(chalk.magenta.bold('ðŸŽ‰ Ilom Bot is fully operational and ready to serve!'));
        console.log(chalk.yellow.bold('\nðŸ“¨ Bot is now listening for incoming messages...'));
        console.log(chalk.cyan(`ðŸ’¬ Send a message with prefix "${config.prefix}" to test (e.g., ${config.prefix}ping)\n`));

    } catch (error) {
        logger.error('Bot initialization failed:', error);
        console.log(chalk.red.bold('âŒ Initialization failed - Check logs for details'));
        process.exit(1);
    }
}

initializeBot().then(() => {
    logger.info('âœ¨ Bot is now running continuously...');
    return new Promise(() => {});
}).catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
});