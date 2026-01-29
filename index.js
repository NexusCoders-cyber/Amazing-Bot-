require('dotenv').config();
const pino = require('pino');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    delay
} = require('@whiskeysockets/baileys');

const commandHandler = require('./lib/command');
const messageHandler = require('./lib/message');

const SESSION_PATH = './session';
const MAX_RECONNECT_ATTEMPTS = 50;
const RECONNECT_DELAY = 5000;
const QR_TIMEOUT = 60000;

let sock;
let reconnectAttempts = 0;
let qrRetries = 0;
let isConnecting = false;
let lastDisconnectTime = 0;
let connectionRetryTimeout = null;

const logger = pino({
    level: process.env.LOG_LEVEL || 'silent',
    timestamp: () => `,"time":"${new Date().toISOString()}"`
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('WhatsApp Bot is running!');
});

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

async function createDirectoryStructure() {
    const dirs = ['session', 'lib', 'plugins', 'media', 'temp', 'database'];
    for (const dir of dirs) {
        await fs.ensureDir(path.join(__dirname, dir));
    }
}

function displayStartupBanner() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     WhatsApp Bot Starting...          ║');
    console.log('╚════════════════════════════════════════╝\n');
}

async function processSessionCredentials(sessionId) {
    if (!sessionId) {
        throw new Error('SESSION_ID not found in .env file');
    }

    const sessionDir = path.join(__dirname, SESSION_PATH);
    await fs.ensureDir(sessionDir);

    const credsPath = path.join(sessionDir, 'creds.json');

    if (sessionId.startsWith('sypher™~')) {
        const base64Data = sessionId.replace('sypher™~', '');
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        const credsData = JSON.parse(jsonString);
        await fs.writeJSON(credsPath, credsData, { spaces: 2 });
        logger.info('Processed sypher™ session format');
        return;
    }

    if (sessionId.startsWith('Ilom~')) {
        const base64Data = sessionId.replace('Ilom~', '');
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        const credsData = JSON.parse(jsonString);
        await fs.writeJSON(credsPath, credsData, { spaces: 2 });
        logger.info('Processed Ilom session format');
        return;
    }

    try {
        const credsData = JSON.parse(sessionId);
        await fs.writeJSON(credsPath, credsData, { spaces: 2 });
        logger.info('Processed JSON session format');
        return;
    } catch (e) {
        try {
            const jsonString = Buffer.from(sessionId, 'base64').toString('utf-8');
            const credsData = JSON.parse(jsonString);
            await fs.writeJSON(credsPath, credsData, { spaces: 2 });
            logger.info('Processed base64 session format');
            return;
        } catch (err) {
            throw new Error('Invalid SESSION_ID format');
        }
    }
}

async function sendBotStatusUpdate(status, qrCode = null) {
    if (!sock || !sock.user) return;

    const ownerNumber = process.env.OWNER_NUMBER;
    if (!ownerNumber) return;

    const jid = ownerNumber.includes('@') ? ownerNumber : `${ownerNumber}@s.whatsapp.net`;

    try {
        let message = `*Bot Status Update*\n\n`;
        message += `Status: ${status}\n`;
        message += `Time: ${new Date().toLocaleString()}\n`;

        if (qrCode) {
            await sock.sendMessage(jid, { text: message });
            await sock.sendMessage(jid, { image: qrCode });
        } else {
            await sock.sendMessage(jid, { text: message });
        }
    } catch (error) {
        logger.error('Failed to send status update:', error);
    }
}

function setupEventHandlers(sock, saveCreds) {
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            if (type !== 'notify') return;
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            await messageHandler(sock, msg);
            await commandHandler(sock, msg);
        } catch (error) {
            logger.error('Message handler error:', error);
        }
    });

    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update.messageStubType) {
                logger.info('Message update:', update);
            }
        }
    });

    sock.ev.on('messages.delete', async (deleted) => {
        logger.info('Messages deleted:', deleted);
    });

    sock.ev.on('messages.reaction', async (reactions) => {
        logger.info('Message reactions:', reactions);
    });

    sock.ev.on('group-participants.update', async (update) => {
        logger.info('Group participants update:', update);
    });

    sock.ev.on('groups.update', async (updates) => {
        logger.info('Groups update:', updates);
    });

    sock.ev.on('call', async (callData) => {
        logger.info('Incoming call:', callData);
    });

    sock.ev.on('contacts.update', async (contacts) => {
        for (const contact of contacts) {
            if (contact.imgUrl) {
                logger.info('Contact updated:', contact);
            }
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrRetries++;
            console.log('\n╔════════════════════════════════════════╗');
            console.log('║     Scan QR Code to Connect            ║');
            console.log('╚════════════════════════════════════════╝\n');
            console.log(qr);
            
            if (qrRetries > 3) {
                console.log('\n⚠️  QR Code displayed multiple times. Please scan to connect.\n');
            }
        }

        if (connection === 'open') {
            isConnecting = false;
            reconnectAttempts = 0;
            qrRetries = 0;
            lastDisconnectTime = 0;
            
            if (connectionRetryTimeout) {
                clearTimeout(connectionRetryTimeout);
                connectionRetryTimeout = null;
            }

            console.log('\n✅ Connected to WhatsApp successfully!');
            console.log(`📱 Logged in as: ${sock.user?.name || 'Unknown'}`);
            console.log(`📞 Number: ${sock.user?.id?.split(':')[0] || 'Unknown'}\n`);

            await sendBotStatusUpdate('✅ Bot Connected Successfully');
        }

        if (connection === 'close') {
            isConnecting = false;
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = Object.keys(DisconnectReason).find(
                key => DisconnectReason[key] === statusCode
            ) || 'Unknown';

            console.log(`\n⚠️  Connection closed. Reason: ${reason} (${statusCode})`);

            if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const now = Date.now();
                const timeSinceLastDisconnect = now - lastDisconnectTime;
                lastDisconnectTime = now;

                let retryDelay = RECONNECT_DELAY;
                
                if (statusCode === DisconnectReason.restartRequired) {
                    retryDelay = 2000;
                    console.log('🔄 Restart required. Reconnecting in 2 seconds...');
                } else if (statusCode === DisconnectReason.connectionLost) {
                    retryDelay = 3000;
                    console.log('🔄 Connection lost. Reconnecting in 3 seconds...');
                } else if (statusCode === DisconnectReason.timedOut) {
                    retryDelay = 5000;
                    console.log('🔄 Connection timed out. Reconnecting in 5 seconds...');
                } else if (statusCode === DisconnectReason.badSession) {
                    console.log('❌ Bad session. Please delete session folder and scan QR again.');
                    process.exit(1);
                } else if (statusCode === DisconnectReason.connectionReplaced) {
                    console.log('❌ Connection replaced by another session.');
                    process.exit(1);
                } else {
                    retryDelay = Math.min(RECONNECT_DELAY * (reconnectAttempts + 1), 30000);
                }

                if (timeSinceLastDisconnect < 2000) {
                    retryDelay += 5000;
                }

                reconnectAttempts++;
                console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${retryDelay / 1000}s...`);

                if (connectionRetryTimeout) {
                    clearTimeout(connectionRetryTimeout);
                }

                connectionRetryTimeout = setTimeout(async () => {
                    try {
                        await establishWhatsAppConnection();
                    } catch (error) {
                        console.error('Reconnection failed:', error.message);
                        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                            setTimeout(() => establishWhatsAppConnection(), RECONNECT_DELAY);
                        }
                    }
                }, retryDelay);
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log('\n❌ Device logged out. Please delete session folder and scan QR code again.\n');
                await fs.remove(SESSION_PATH);
                process.exit(1);
            } else {
                console.log('\n❌ Maximum reconnection attempts reached. Exiting...\n');
                process.exit(1);
            }
        }

        if (connection === 'connecting') {
            console.log('🔄 Connecting to WhatsApp...');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

async function establishWhatsAppConnection() {
    if (isConnecting) {
        console.log('⚠️  Connection already in progress...');
        return;
    }

    isConnecting = true;

    try {
        const sessionId = process.env.SESSION_ID;
        const sessionExists = await fs.pathExists(path.join(SESSION_PATH, 'creds.json'));

        if (!sessionExists && sessionId) {
            await processSessionCredentials(sessionId);
        }

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            browser: Browsers.ubuntu('Chrome'),
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                return { conversation: '' };
            },
            defaultQueryTimeoutMs: undefined,
            keepAliveIntervalMs: 30000,
            connectTimeoutMs: 60000,
            qrTimeout: QR_TIMEOUT,
            retryRequestDelayMs: 250,
            maxMsgRetryCount: 5,
            emitOwnEvents: false,
            fireInitQueries: true,
            shouldIgnoreJid: (jid) => false,
            linkPreviewImageThumbnailWidth: 192,
            transactionOpts: {
                maxCommitRetries: 10,
                delayBetweenTriesMs: 3000
            },
            cachedGroupMetadata: async (jid) => null,
            shouldSyncHistoryMessage: () => false,
            patchMessageBeforeSending: (message) => {
                return message;
            }
        });

        setupEventHandlers(sock, saveCreds);

        sock.ws.on('error', (error) => {
            console.error('WebSocket error:', error.message);
        });

        sock.ws.on('close', () => {
            console.log('WebSocket closed');
        });

        return sock;
    } catch (error) {
        isConnecting = false;
        console.error('Connection error:', error.message);
        throw error;
    }
}

function setupProcessHandlers() {
    const cleanup = async (signal) => {
        console.log(`\n\n📴 Received ${signal}. Shutting down gracefully...`);
        
        if (connectionRetryTimeout) {
            clearTimeout(connectionRetryTimeout);
        }

        if (sock) {
            try {
                await sock.logout();
                console.log('✅ Logged out successfully');
            } catch (error) {
                console.log('⚠️  Logout error:', error.message);
            }
        }

        console.log('👋 Goodbye!\n');
        process.exit(0);
    };

    process.on('SIGINT', () => cleanup('SIGINT'));
    process.on('SIGTERM', () => cleanup('SIGTERM'));

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            setTimeout(() => establishWhatsAppConnection(), RECONNECT_DELAY);
        } else {
            process.exit(1);
        }
    });
}

async function loadSavedSettings() {
    try {
        const settingsPath = path.join(__dirname, 'database', 'settings.json');
        if (await fs.pathExists(settingsPath)) {
            const settings = await fs.readJSON(settingsPath);
            logger.info('Settings loaded:', settings);
            return settings;
        }
    } catch (error) {
        logger.error('Failed to load settings:', error);
    }
    return {};
}

async function initializeBot() {
    try {
        displayStartupBanner();
        await createDirectoryStructure();
        setupProcessHandlers();
        await loadSavedSettings();
        await establishWhatsAppConnection();
    } catch (error) {
        console.error('Initialization error:', error);
        process.exit(1);
    }
}

initializeBot();

module.exports = { sock };