import express from 'express';
import fs from 'fs-extra';
import pino from 'pino';
import pn from 'awesome-phonenumber';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import {
    makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    fetchLatestBaileysVersion,
    DisconnectReason
} from '@whiskeysockets/baileys';
import { upload as megaUpload } from './mega.js';

const router = express.Router();

const MAX_RECONNECT_ATTEMPTS = 6;
const SESSION_TIMEOUT = 12 * 60 * 1000;
const CLEANUP_DELAY = 5000;
const POST_PAIRING_CODE_WAIT_MS = 4000;
const POST_CONNECT_SETTLE_MS = 8000;
const CREDS_WAIT_TIMEOUT_MS = 15000;
const CREDS_POLL_INTERVAL_MS = 500;

async function removeFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return false;
        await fs.remove(filePath);
        return true;
    } catch (error) {
        console.error('Error removing file:', error);
        return false;
    }
}

async function zipAuthDir(dirPath) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const stream = new PassThrough();
        const chunks = [];

        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);

        archive.on('error', reject);
        archive.pipe(stream);
        archive.directory(dirPath, false);
        archive.finalize().catch(reject);
    });
}

async function waitForFile(filePath, timeoutMs = CREDS_WAIT_TIMEOUT_MS, intervalMs = CREDS_POLL_INTERVAL_MS) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        if (fs.existsSync(filePath)) return true;
        await delay(intervalMs);
    }

    return fs.existsSync(filePath);
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).send({ code: 'Phone number is required' });

    num = String(num).replace(/[^0-9]/g, '');
    const phone = pn('+' + num);
    if (!phone.isValid()) return res.status(400).send({ code: 'Invalid phone number.' });
    num = phone.getNumber('e164').replace('+', '');

    const authDir = `./auth_info_baileys/session_${num}`;

    let pairingCodeSent = false;
    let sessionCompleted = false;
    let isCleaningUp = false;
    let responseSent = false;
    let reconnectAttempts = 0;
    let currentSocket = null;
    let timeoutHandle = null;

    async function cleanup(reason = 'unknown') {
        if (isCleaningUp) return;
        isCleaningUp = true;

        console.log(`🧹 Cleanup (${num}) - ${reason}`);

        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
        }

        if (currentSocket) {
            try {
                currentSocket.ev.removeAllListeners();
                currentSocket.ws?.close?.();
            } catch {}
            currentSocket = null;
        }

        setTimeout(async () => {
            await removeFile(authDir);
        }, CLEANUP_DELAY);
    }

    async function initiateSession() {
        if (sessionCompleted || isCleaningUp) return;

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            if (!responseSent && !res.headersSent) {
                responseSent = true;
                res.status(503).send({ code: 'Connection failed' });
            }
            await cleanup('max_reconnects');
            return;
        }

        try {
            if (!fs.existsSync(authDir)) await fs.mkdir(authDir, { recursive: true });

            const { state, saveCreds } = await useMultiFileAuthState(authDir);
            const { version } = await fetchLatestBaileysVersion();

            if (currentSocket) {
                try {
                    currentSocket.ev.removeAllListeners();
                    currentSocket.ws?.close?.();
                } catch {}
                currentSocket = null;
            }

            currentSocket = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino({ level: 'fatal' }).child({ level: 'fatal' })
                    )
                },
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }),
                browser: typeof Browsers?.ubuntu === 'function'
                    ? Browsers.ubuntu('Chrome')
                    : Browsers.macOS('Chrome'),
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                retryRequestDelayMs: 250,
                maxRetries: 3
            });

            const sock = currentSocket;
            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === 'open') {
                    if (sessionCompleted) return;
                    sessionCompleted = true;

                    console.log(`✅ Connected for ${num} — preparing session file`);

                    try {
                        await delay(POST_CONNECT_SETTLE_MS);
                        await saveCreds();

                        const credsFile = `${authDir}/creds.json`;
                        const credsReady = await waitForFile(credsFile);
                        if (!credsReady) {
                            throw new Error('creds.json not found after successful link');
                        }

                        const zipBuffer = await zipAuthDir(authDir);
                        const megaLink = await megaUpload(zipBuffer, `${num}.zip`);
                        const sessionId = `ilombot--${Buffer.from(megaLink).toString('base64')}`;
                        const userJid = `${num}@s.whatsapp.net`;

                        if (!responseSent && !res.headersSent) {
                            responseSent = true;
                            res.send({
                                code: 'linked',
                                message: 'WhatsApp linked. Session file is being sent to your WhatsApp chat.'
                            });
                        }

                        await sock.sendMessage(userJid, {
                            document: Buffer.from(JSON.stringify({
                                sessionId,
                                megaUrl: megaLink
                            }, null, 2), 'utf8'),
                            fileName: `${num}-session.json`,
                            mimetype: 'application/json',
                            caption: '✅ Session file generated. Copy `sessionId` into bot SESSION_ID env.'
                        });

                        await sock.sendMessage(userJid, {
                            text: `✅ Session ID:\n${sessionId}`
                        });
                    } catch (error) {
                        console.error('❌ Session delivery failed:', error);
                        if (!responseSent && !res.headersSent) {
                            responseSent = true;
                            res.status(500).send({ code: 'Session send failed', error: error.message });
                        }
                    } finally {
                        await cleanup('session_complete');
                    }
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    console.log(`🔌 Connection closed for ${num} — code: ${statusCode}`);

                    if (sessionCompleted || isCleaningUp) {
                        await cleanup('already_complete');
                        return;
                    }

                    if (
                        statusCode === DisconnectReason.loggedOut ||
                        statusCode === DisconnectReason.badSession ||
                        statusCode === 401
                    ) {
                        if (!responseSent && !res.headersSent) {
                            responseSent = true;
                            res.status(401).send({ code: 'Session expired or invalid' });
                        }
                        await cleanup('logged_out');
                        return;
                    }

                    if (pairingCodeSent && !sessionCompleted) {
                        reconnectAttempts += 1;
                        console.log(`🔄 Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                        await delay(2000);
                        await initiateSession();
                    } else {
                        await cleanup('connection_closed');
                    }
                }
            });

            if (!state.creds.registered && !pairingCodeSent && !isCleaningUp) {
                await delay(POST_PAIRING_CODE_WAIT_MS);

                try {
                    pairingCodeSent = true;
                    let code = await sock.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;

                    if (!responseSent && !res.headersSent) {
                        responseSent = true;
                        res.send({ code, message: 'Enter this in WhatsApp > Linked Devices > Link with phone number' });
                    }
                } catch (error) {
                    console.error('❌ Failed to get pairing code:', error);
                    pairingCodeSent = false;

                    if (!responseSent && !res.headersSent) {
                        responseSent = true;
                        res.status(503).send({ code: 'Failed to get pairing code' });
                    }
                    await cleanup('pairing_error');
                }
            }

            timeoutHandle = setTimeout(async () => {
                if (!sessionCompleted && !isCleaningUp) {
                    if (!responseSent && !res.headersSent) {
                        responseSent = true;
                        res.status(408).send({ code: 'Pairing timeout — please try again' });
                    }
                    await cleanup('timeout');
                }
            }, SESSION_TIMEOUT);
        } catch (error) {
            console.error(`❌ Error initializing session for ${num}:`, error);
            if (!responseSent && !res.headersSent) {
                responseSent = true;
                res.status(503).send({ code: 'Service unavailable' });
            }
            await cleanup('init_error');
        }
    }

    await initiateSession();
});

export default router;
