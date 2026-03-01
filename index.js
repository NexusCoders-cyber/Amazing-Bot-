import 'dotenv/config';
import P from 'pino';
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import NodeCache from 'node-cache';
import chalk from 'chalk';
import figlet from 'figlet';

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

global._config = config;

const msgRetryCounterCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });
const app = express();
let sock = null;
let isShuttingDown = false;
let connectionTimeout = null;
let reconnectAttempts = 0;

const SESSION_PATH = path.join(process.cwd(), 'cache', 'auth_info_baileys');
const MAX_RECONNECT = 10;
const RECONNECT_DELAYS = [3000, 5000, 10000, 15000, 20000, 30000, 30000, 30000, 30000, 30000];

const W = 65;
const line  = chalk.hex('#8B5CF6')('═'.repeat(W));
const tline = chalk.hex('#6D28D9')('─'.repeat(W));

function box(content) {
    console.log(chalk.hex('#8B5CF6')('╔' + '═'.repeat(W) + '╗'));
    for (const row of content) {
        const visible = row.replace(/\x1B\[[0-9;]*m/g, '');
        const pad = W - visible.length;
        console.log(chalk.hex('#8B5CF6')('║') + row + ' '.repeat(Math.max(0, pad)) + chalk.hex('#8B5CF6')('║'));
    }
    console.log(chalk.hex('#8B5CF6')('╚' + '═'.repeat(W) + '╝'));
}

function step(icon, label, value) {
    const lbl = chalk.hex('#C4B5FD')(label.padEnd(22));
    const val = value ? chalk.whiteBright(value) : '';
    console.log(`  ${chalk.hex('#FBBF24')('◈')}  ${icon}  ${lbl} ${val}`);
}

function stepDone(icon, label, value) {
    const lbl = chalk.greenBright(label.padEnd(22));
    const val = value ? chalk.whiteBright(value) : chalk.greenBright('Done');
    console.log(`  ${chalk.greenBright('✔')}  ${icon}  ${lbl} ${val}`);
}

function stepLoading(icon, label) {
    const lbl = chalk.hex('#C4B5FD')(label.padEnd(22));
    console.log(`  ${chalk.hex('#FBBF24')('◈')}  ${icon}  ${lbl} ${chalk.hex('#6B7280')('...')}`);
}

async function displayBanner() {
    console.clear();
    const gradient = (await import('gradient-string')).default;

    const banner = figlet.textSync('ILOM  BOT', {
        font: 'ANSI Shadow',
        horizontalLayout: 'fitted'
    });

    console.log(gradient.cristal(banner));
    console.log();
    console.log(line);
    console.log(gradient.rainbow('  ✦  Amazing WhatsApp Bot  ✦  v' + (constants.BOT_VERSION || '1.0.0') + '  ✦  By Ilom  ✦  Powered by Raphael  ✦'));
    console.log(chalk.hex('#7C3AED')('  Baileys  ·  Cerebras AI  ·  MongoDB  ·  NodeCache'));
    console.log(line);
    console.log();
}

async function displayConfig() {
    console.log(chalk.hex('#8B5CF6').bold('  ⚙  CONFIGURATION'));
    console.log(tline);
    step('🤖', 'Bot Name',    config.botName);
    step('📌', 'Prefix',      config.prefix);
    step('🌐', 'Mode',        config.publicMode ? chalk.greenBright('Public') : chalk.yellowBright('Private'));
    step('👑', 'Owners',      config.ownerNumbers.length + ' configured');
    step('🔑', 'Session',     process.env.SESSION_ID ? chalk.greenBright('Present') : chalk.yellowBright('QR Required'));
    step('🗄️', 'Database',    config.database?.enabled ? chalk.greenBright('Enabled') : chalk.gray('Disabled'));
    step('📡', 'Redis',       config.redis?.enabled ? chalk.greenBright('Enabled') : chalk.gray('Disabled'));
    step('🌍', 'Node',        process.version);
    console.log();
}

async function displayReady(commandCount, pluginCount) {
    const gradient = (await import('gradient-string')).default;
    console.log();
    console.log(line);
    console.log(gradient.pastel('  ╔══════════════════════════════════════════════════════════════╗'));
    console.log(gradient.pastel('  ║                                                              ║'));
    console.log('  ' + chalk.hex('#8B5CF6')('║') + gradient.cristal('         ✦  ILOM BOT IS ONLINE AND READY  ✦            ') + chalk.hex('#8B5CF6')('║'));
    console.log(gradient.pastel('  ║                                                              ║'));
    console.log('  ' + chalk.hex('#8B5CF6')('║') + chalk.hex('#60A5FA')('  Commands: ') + chalk.whiteBright(String(commandCount).padEnd(6)) + chalk.hex('#60A5FA')('  Plugins: ') + chalk.whiteBright(String(pluginCount).padEnd(6)) + chalk.hex('#60A5FA')('  Prefix: ') + chalk.whiteBright(config.prefix.padEnd(14)) + chalk.hex('#8B5CF6')('║'));
    console.log('  ' + chalk.hex('#8B5CF6')('║') + chalk.hex('#34D399')('  📨 Listening for messages...') + ' '.repeat(33) + chalk.hex('#8B5CF6')('║'));
    console.log('  ' + chalk.hex('#8B5CF6')('║') + chalk.hex('#FBBF24')('  💬 Test with: ') + chalk.whiteBright(config.prefix + 'ping') + ' '.repeat(44) + chalk.hex('#8B5CF6')('║'));
    console.log(gradient.pastel('  ║                                                              ║'));
    console.log(gradient.pastel('  ╚══════════════════════════════════════════════════════════════╝'));
    console.log();
}

async function createDirectoryStructure() {
    const dirs = [
        'src/commands/admin', 'src/commands/ai', 'src/commands/downloader',
        'src/commands/economy', 'src/commands/fun', 'src/commands/games',
        'src/commands/general', 'src/commands/media', 'src/commands/owner',
        'src/commands/utility', 'src/handlers', 'src/models', 'src/plugins',
        'src/services', 'src/utils', 'temp/downloads', 'temp/uploads',
        'temp/stickers', 'temp/audio', 'temp/video', 'logs', 'session',
        'backups/database', 'backups/session', 'data/ai', 'data/economy'
    ];
    await Promise.all(dirs.map(d => fs.ensureDir(d)));
}

async function processSessionCredentials() {
    await fs.ensureDir(SESSION_PATH);
    await fs.ensureDir(path.join(SESSION_PATH, 'keys'));

    const sessionId = process.env.SESSION_ID?.trim();
    if (!sessionId) {
        logger.info('No SESSION_ID - will generate QR code');
        return false;
    }

    try {
        logger.info('Processing session credentials...');
        let sessionData;

        if (sessionId.startsWith('sypher™--') || sessionId.startsWith('sypher sypher™--')) {
            const sessdata = sessionId.replace('sypher sypher™--', '').replace('sypher™--', '').trim();
            const axios = (await import('axios')).default;
            const response = await axios.get(
                `https://existing-madelle-lance-ui-efecfdce.koyeb.app/download/${sessdata}`,
                { responseType: 'arraybuffer', timeout: 30000 }
            );
            const credPath = path.join(SESSION_PATH, 'creds.json');
            await fs.writeFile(credPath, response.data);
            const saved = await fs.readJSON(credPath);
            if (!saved.noiseKey && !saved.signedIdentityKey) {
                await fs.remove(credPath);
                throw new Error('Invalid session file');
            }
            logger.info('Sypher session loaded successfully');
            return true;
        }

        if (sessionId.startsWith('Ilom~')) {
            sessionData = JSON.parse(Buffer.from(sessionId.replace('Ilom~', ''), 'base64').toString());
        } else if (sessionId.startsWith('{')) {
            sessionData = JSON.parse(sessionId);
        } else {
            try {
                sessionData = JSON.parse(Buffer.from(sessionId, 'base64').toString());
            } catch {
                sessionData = JSON.parse(sessionId);
            }
        }

        if (sessionData?.creds) {
            await fs.writeJSON(path.join(SESSION_PATH, 'creds.json'), sessionData.creds, { spaces: 2 });
            if (sessionData.keys && typeof sessionData.keys === 'object') {
                const keysPath = path.join(SESSION_PATH, 'keys');
                for (const [keyName, keyData] of Object.entries(sessionData.keys)) {
                    if (keyData && typeof keyData === 'object') {
                        await fs.writeJSON(path.join(keysPath, `${keyName}.json`), keyData, { spaces: 2 });
                    }
                }
            }
        } else {
            await fs.writeJSON(path.join(SESSION_PATH, 'creds.json'), sessionData, { spaces: 2 });
        }

        logger.info('Session credentials processed');
        return true;
    } catch (error) {
        logger.warn(`Session processing failed: ${error.message} - will use QR`);
        await fs.remove(path.join(SESSION_PATH, 'creds.json')).catch(() => {});
        return false;
    }
}

async function sendBotStatusUpdate(sock) {
    const now = new Date().toLocaleString('en-US', {
        timeZone: config.timezone || 'UTC',
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const text = `${config.botName} is Online\n\nStarted: ${now}\nMode: ${config.publicMode ? 'Public' : 'Private'}\nPrefix: ${config.prefix}\nCommands: ${commandHandler.getCommandCount()}\nPlugins: ${getActiveCount()}\n\nType ${config.prefix}help to see all commands`;

    for (const owner of config.ownerNumbers) {
        try {
            await sock.sendMessage(owner, { text });
        } catch {}
    }
}

async function setupEventHandlers(sock, saveCreds) {
    sock.ev.on('creds.update', async () => { await saveCreds(); });

    await messageHandler.initializeCommandHandler();

    sock.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages?.length) return;
        for (const message of messages) {
            try {
                if (!message?.key) continue;
                const from = message.key.remoteJid;
                if (!from || from === 'status@broadcast') continue;
                if (message.key.fromMe && !config.selfMode) continue;
                if (!message.message || !Object.keys(message.message).length) continue;

                const ignoredTypes = ['protocolMessage', 'senderKeyDistributionMessage', 'messageContextInfo'];
                const hasContent = Object.keys(message.message).some(k => !ignoredTypes.includes(k));
                if (!hasContent) continue;

                await messageHandler.handleIncomingMessage(sock, message);
            } catch (error) {
                logger.error('Error processing message:', error);
            }
        }
    });

    sock.ev.on('messages.update', async (updates) => {
        if (config.events?.messageUpdate) {
            await messageHandler.handleMessageUpdate(sock, updates);
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        try {
            await groupHandler.handleParticipantsUpdate(sock, update);
        } catch (error) {
            logger.error('Group participants update error:', error);
        }
    });

    sock.ev.on('groups.update', async (updates) => {
        try {
            await groupHandler.handleGroupUpdate(sock, updates);
        } catch (error) {
            logger.error('Groups update error:', error);
        }
    });

    sock.ev.on('call', async (calls) => {
        await callHandler.handleIncomingCall(sock, calls);
    });

    setInterval(() => {
        if (sock?.user && !isShuttingDown) {
            sock.sendPresenceUpdate('available').catch(() => {});
        }
    }, 60000);

    logger.info('All event handlers registered');
}

async function establishWhatsAppConnection() {
    return new Promise(async (resolve, reject) => {
        try {
            const { makeWASocket, Browsers, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = await import('@whiskeysockets/baileys');

            const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
            const { version } = await fetchLatestBaileysVersion();

            logger.info(`Connecting with Baileys v${version.join('.')}`);

            sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' }).child({ level: 'fatal' }))
                },
                printQRInTerminal: true,
                browser: Browsers.ubuntu('Chrome'),
                markOnlineOnConnect: config.autoOnline !== false,
                syncFullHistory: false,
                defaultQueryTimeoutMs: undefined,
                connectTimeoutMs: 120000,
                keepAliveIntervalMs: 25000,
                retryRequestDelayMs: 250,
                generateHighQualityLinkPreview: false,
                logger: P({ level: 'silent' }),
                version,
                getMessage: async () => ({ conversation: '' })
            });

            if (connectionTimeout) clearTimeout(connectionTimeout);
            connectionTimeout = setTimeout(() => {
                if (!sock?.user) {
                    logger.warn('Connection timeout - retrying');
                    handleReconnect(resolve, reject);
                }
            }, 120000);

            sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
                if (qr) {
                    console.log(chalk.hex('#FBBF24').bold('\n  📱  Scan the QR code above with WhatsApp\n'));
                    if (qrService.isQREnabled()) {
                        await qrService.generateQR(qr).catch(() => {});
                    }
                }

                if (connection === 'open') {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                    reconnectAttempts = 0;

                    stepDone('📡', 'WhatsApp', chalk.greenBright('Connected!'));
                    console.log();

                    if (qrService.isQREnabled()) await qrService.clearQR().catch(() => {});

                    await setupEventHandlers(sock, saveCreds);
                    global.sock = sock;
                    await sendBotStatusUpdate(sock).catch(() => {});
                    resolve(sock);
                }

                if (connection === 'close') {
                    if (connectionTimeout) { clearTimeout(connectionTimeout); connectionTimeout = null; }
                    if (isShuttingDown) return resolve(null);

                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    logger.warn(`Connection closed. Code: ${statusCode}`);

                    const fatalCodes = [
                        DisconnectReason.badSession,
                        DisconnectReason.loggedOut,
                        DisconnectReason.connectionReplaced
                    ];

                    if (fatalCodes.includes(statusCode)) {
                        logger.error('Fatal disconnect - clearing session');
                        await fs.remove(SESSION_PATH).catch(() => {});
                        await fs.ensureDir(SESSION_PATH);
                        await fs.ensureDir(path.join(SESSION_PATH, 'keys'));
                        setTimeout(() => process.exit(1), 2000);
                    } else {
                        console.log(chalk.yellowBright(`\n  ⚠  Disconnected (${statusCode}) — reconnecting...\n`));
                        handleReconnect(resolve, reject);
                    }
                }
            });

            sock.ev.on('creds.update', async () => { await saveCreds(); });

        } catch (error) {
            logger.error('Connection setup failed:', error);
            handleReconnect(resolve, reject);
        }
    });
}

function handleReconnect(resolve, reject) {
    if (isShuttingDown) return resolve(null);
    if (reconnectAttempts >= MAX_RECONNECT) {
        return reject(new Error(`Max reconnection attempts (${MAX_RECONNECT}) reached`));
    }
    const delay = RECONNECT_DELAYS[reconnectAttempts] || 30000;
    reconnectAttempts++;
    console.log(chalk.hex('#FBBF24')(`\n  ↺  Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT})\n`));
    setTimeout(() => establishWhatsAppConnection().then(resolve).catch(reject), delay);
}

function setupProcessHandlers() {
    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception:', error);
        setTimeout(() => process.exit(1), 2000);
    });

    const gracefulShutdown = async (signal) => {
        console.log(chalk.redBright(`\n  ⏹  ${signal} — shutting down gracefully\n`));
        isShuttingDown = true;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (sock) {
            try { await sock.logout(); } catch {}
        }
        process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

async function loadSavedSettings() {
    try {
        const mongoose = await import('mongoose');
        if (mongoose.default.connection.readyState !== 1) return;
        const prefixSetting = await Settings.findOne({ key: 'prefix' }).catch(() => null);
        if (prefixSetting?.value) {
            config.prefix = prefixSetting.value;
            logger.info(`Loaded saved prefix: ${config.prefix}`);
        }
    } catch {}
}

async function initializeBot() {
    try {
        await displayBanner();
        await displayConfig();

        console.log(chalk.hex('#8B5CF6').bold('  ⚡  INITIALIZING SYSTEMS'));
        console.log(tline);

        stepLoading('📁', 'Directories');
        await createDirectoryStructure();
        stepDone('📁', 'Directories');

        stepLoading('🗄️', 'Database');
        await connectToDatabase();
        stepDone('🗄️', 'Database');

        stepLoading('💾', 'Settings');
        await loadSavedSettings();
        stepDone('💾', 'Settings', `Prefix: ${config.prefix}`);

        stepLoading('🔑', 'Session');
        const hasSession = await processSessionCredentials();
        hasSession ? stepDone('🔑', 'Session', 'Loaded') : stepDone('🔑', 'Session', chalk.yellowBright('QR Mode'));

        stepLoading('⚡', 'Cache');
        await initializeCache();
        stepDone('⚡', 'Cache');

        stepLoading('📦', 'Commands');
        await commandHandler.initialize();
        await commandHandler.loadCommands();
        stepDone('📦', 'Commands', `${commandHandler.getCommandCount()} loaded`);

        stepLoading('🔌', 'Plugins');
        await loadPlugins();
        stepDone('🔌', 'Plugins', `${getActiveCount()} active`);

        stepLoading('🕐', 'Scheduler');
        await startScheduler();
        stepDone('🕐', 'Scheduler');

        stepLoading('🌐', 'Web Server');
        await startWebServer(app);
        stepDone('🌐', 'Web Server', `Port ${config.server?.port || process.env.PORT || 5000}`);

        console.log();
        console.log(tline);
        stepLoading('📡', 'WhatsApp');
        console.log();

        await establishWhatsAppConnection();

        setupProcessHandlers();

        await displayReady(commandHandler.getCommandCount(), getActiveCount());

    } catch (error) {
        console.log(chalk.redBright('\n  ✘  Initialization failed: ' + error.message));
        logger.error('Initialization failed:', error);
        process.exit(1);
    }
}

initializeBot().then(() => new Promise(() => {})).catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
});