import './src/utils/loadEnv.js';
import P from 'pino';
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline/promises';
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
import { enableAutoTranslate } from './src/utils/translator.js';
import qrService from './src/services/qrService.js';
import Settings from './src/models/Settings.js';
import { startTelegramPairBot } from './src/services/telegramPairBot.js';
import { setPairingSessionSocketHandler, startSavedPairedSessions } from './src/services/pairingService.js';

global._config = config;

const msgRetryCounterCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });
const app = express();
let sock = null;
let isShuttingDown = false;
let connectionTimeout = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let reconnectInProgress = false;
let cachedPairingNumber = null;
let telegramBotController = null;
let generatedSessionSaved = false;
let pairedSessionDeployTimer = null;
let lastLoggedOutAt = 0;
const pairedRuntimeSockets = new WeakSet();

const SESSION_PATH = process.env.SESSION_AUTH_DIR || path.join(process.cwd(), 'cache', 'auth_info_baileys');
const GENERATED_SESSION_FILE = path.join(process.cwd(), 'data', 'generated_session_id.txt');
const MAX_RECONNECT = 10;
const RECONNECT_DELAYS = [3000, 5000, 10000, 15000, 20000, 30000, 30000, 30000, 30000, 30000];
const NEWSLETTER_CHANNELS = [
    '120363422324286734@newsletter', // primeee main
    '120363422779360967@newsletter', // primee support
    '120363421725025395@newsletter', // primeee testin
    '120363406682873896@newsletter', // requested user channel
    '120363421929524308@newsletter',
    '120363423826830863@newsletter',
    '120363421055682094@newsletter'
];

const W = 65;
const line  = chalk.hex('#8B5CF6')('═'.repeat(W));
const tline = chalk.hex('#6D28D9')('─'.repeat(W));

function shouldUsePairingCodeFlow() {
    return String(process.env.DISABLE_PAIRING_CODE_FLOW || '').toLowerCase() !== 'true';
}

function getSessionIdentifier() {
    const raw = (
        process.env.SESSION_ID ||
        process.env.SESSIONID ||
        process.env.SESSION ||
        process.env.WA_SESSION_ID ||
        process.env.ASTABOT_SESSION_ID ||
        process.env.SESSION_CREDS_JSON ||
        process.env.CREDS_JSON ||
        config.session?.sessionId ||
        ''
    );

    return String(raw || '')
        .trim()
        .replace(/^['"`]|['"`]$/g, '')
        .replace(/^SESSION_ID\s*=\s*/i, '')
        .trim();
}

async function getSessionIdFromEnvFile() {
    const envPath = path.join(process.cwd(), '.env');
    if (!await fs.pathExists(envPath)) return '';

    const lines = (await fs.readFile(envPath, 'utf8')).split(/\r?\n/);
    for (const rawLine of lines) {
        const line = String(rawLine || '').trim();
        if (!line || line.startsWith('#') || !line.includes('=')) continue;

        const key = line.slice(0, line.indexOf('=')).trim();
        if (key !== 'SESSION_ID') continue;

        const value = line
            .slice(line.indexOf('=') + 1)
            .trim()
            .replace(/^['"`]|['"`]$/g, '')
            .replace(/^SESSION_ID\s*=\s*/i, '')
            .trim();

        if (value) return value;
    }

    return '';
}

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

function escapeEnvValue(value = '') {
    const raw = String(value ?? '');
    return raw.replace(/\r?\n/g, '\\n');
}

async function setEnvValue(key, value) {
    const envPath = path.join(process.cwd(), '.env');
    const nextLine = `${key}=${escapeEnvValue(value)}`;
    let content = '';
    if (await fs.pathExists(envPath)) {
        content = await fs.readFile(envPath, 'utf8');
    }

    const lines = content ? content.split(/\r?\n/) : [];
    let updated = false;
    const mapped = lines.map((line) => {
        if (!line.trim().startsWith('#') && line.includes('=')) {
            const name = line.slice(0, line.indexOf('=')).trim();
            if (name === key) {
                updated = true;
                return nextLine;
            }
        }
        return line;
    });

    if (!updated) mapped.push(nextLine);
    await fs.writeFile(envPath, `${mapped.join('\n').replace(/\n+$/g, '')}\n`, 'utf8');
    process.env[key] = String(value ?? '');
}

async function removeEnvValue(key) {
    const envPath = path.join(process.cwd(), '.env');
    if (!await fs.pathExists(envPath)) return;

    const lines = (await fs.readFile(envPath, 'utf8')).split(/\r?\n/);
    const filtered = lines.filter((line) => {
        if (line.trim().startsWith('#') || !line.includes('=')) return true;
        const name = line.slice(0, line.indexOf('=')).trim();
        return name !== key;
    });
    await fs.writeFile(envPath, `${filtered.join('\n').replace(/\n+$/g, '')}\n`, 'utf8');
    delete process.env[key];
}

async function buildSessionIdFromLocalAuth() {
    const credsPath = path.join(SESSION_PATH, 'creds.json');
    const keysPath = path.join(SESSION_PATH, 'keys');
    if (!await fs.pathExists(credsPath)) return '';

    const creds = await fs.readJSON(credsPath).catch(() => null);
    if (!creds || typeof creds !== 'object') return '';

    const keys = {};
    if (await fs.pathExists(keysPath)) {
        const files = await fs.readdir(keysPath).catch(() => []);
        for (const fileName of files) {
            if (!fileName.endsWith('.json')) continue;
            const keyName = fileName.replace(/\.json$/i, '');
            const keyData = await fs.readJSON(path.join(keysPath, fileName)).catch(() => null);
            if (keyData && typeof keyData === 'object') keys[keyName] = keyData;
        }
    }

    const inline = Buffer.from(JSON.stringify({ creds, keys })).toString('base64');
    return `Ilom~${inline}`;
}

async function persistGeneratedSessionId(sessionId) {
    if (!sessionId) return false;
    await fs.ensureDir(path.dirname(GENERATED_SESSION_FILE));
    await fs.writeFile(GENERATED_SESSION_FILE, `${sessionId}\n`, 'utf8');
    await setEnvValue('SESSION_ID', sessionId);
    await removeEnvValue('SESSION_CREDS_JSON');
    return true;
}

async function clearLocalAuthFiles() {
    const credsPath = path.join(SESSION_PATH, 'creds.json');
    const keysPath = path.join(SESSION_PATH, 'keys');
    await fs.remove(credsPath).catch(() => {});
    await fs.emptyDir(keysPath).catch(() => {});
}

async function hasUsableLocalAuthSession() {
    const credsPath = path.join(SESSION_PATH, 'creds.json');
    if (!await fs.pathExists(credsPath)) return false;

    try {
        const creds = await fs.readJSON(credsPath);
        return Boolean(creds?.registered && creds?.me?.id);
    } catch {
        return false;
    }
}

async function displayBanner() {
    console.clear();
    const gradient = (await import('gradient-string')).default;

    const banner = figlet.textSync('ASTA  BOT', {
        font: 'ANSI Shadow',
        horizontalLayout: 'fitted'
    });

    console.log(gradient.cristal(banner));
    console.log();
    console.log(line);
    console.log(gradient.rainbow('  ✦  Asta WhatsApp Bot  ✦  v' + (constants.BOT_VERSION || '1.0.0') + '  ✦  By Asta  ✦  Powered by Raphael  ✦'));
    console.log(chalk.hex('#7C3AED')('  Baileys  ·  AI  ·  MongoDB  ·  NodeCache'));
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
    step('🔑', 'Session',     getSessionIdentifier() ? chalk.greenBright('Present') : chalk.yellowBright('QR Required'));
    step('🗄️', 'Database',    config.database?.enabled ? chalk.greenBright('Enabled') : chalk.gray('Disabled'));
    step('📡', 'Redis',       config.redis?.enabled ? chalk.greenBright('Enabled') : chalk.gray('Disabled'));
    step('🌍', 'Node',        process.version);
    console.log();
}

function displayDesignLogCard() {
    const sessionPreview = (
        process.env.SESSION_ID ||
        process.env.WA_SESSION_ID ||
        process.env.ASTABOT_SESSION_ID ||
        process.env.CREDS_JSON ||
        process.env.SESSION_CREDS_JSON ||
        ''
    ) ? chalk.greenBright('READY') : chalk.yellowBright('QR MODE');

    const deployPort = process.env.PORT || config.server?.port || 5000;
    const modeBadge = config.publicMode ? chalk.greenBright('PUBLIC') : chalk.yellowBright('PRIVATE');

    box([
        chalk.hex('#C084FC').bold('  🎨  ASTA BOT STARTUP PANEL'),
        chalk.hex('#A78BFA')('  ───────────────────────────────────────────────'),
        `${chalk.hex('#60A5FA')('  ✦ Mode      :')} ${modeBadge}`,
        `${chalk.hex('#34D399')('  ✦ Session   :')} ${sessionPreview}`,
        `${chalk.hex('#FBBF24')('  ✦ Prefix    :')} ${chalk.whiteBright(config.prefix)}`,
        `${chalk.hex('#F472B6')('  ✦ Deploy    :')} ${chalk.whiteBright(`PORT ${deployPort}`)}`,
        `${chalk.hex('#22D3EE')('  ✦ Bot Name  :')} ${chalk.whiteBright(config.botName)}`
    ]);
    console.log();
}

async function displayReady(commandCount, pluginCount) {
    const gradient = (await import('gradient-string')).default;
    console.log();
    console.log(line);
    console.log(gradient.pastel('  ╔══════════════════════════════════════════════════════════════╗'));
    console.log(gradient.pastel('  ║                                                              ║'));
    console.log('  ' + chalk.hex('#8B5CF6')('║') + gradient.cristal('         ✦  ASTA BOT IS ONLINE AND READY  ✦            ') + chalk.hex('#8B5CF6')('║'));
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
    // Clean old temp files at startup to prevent ENOSPC
    const tempDirs = ["temp/downloads", "temp/uploads", "temp/stickers", "temp/audio", "temp/video"];
    for (const td of tempDirs) {
        try {
            const files = fs.readdirSync(td);

// Periodic temp cleanup every 30 minutes
setInterval(() => {
    const tempDirs = ["temp/downloads", "temp/uploads", "temp/stickers", "temp/audio", "temp/video"];
    for (const td of tempDirs) {
        try {
            const files = fs.readdirSync(td);
            for (const f of files) {
                try { fs.unlinkSync(path.join(td, f)); } catch {}
            }
        } catch {}
    }
}, 30 * 60 * 1000);
            for (const f of files) {
                try { fs.unlinkSync(path.join(td, f)); } catch {}
            }
        } catch {}
    }

// ✅ Download creds.json from Mega using the FULL URL (file ID + #decryption key)
async function downloadFromMega(fullMegaUrl) {
    const { File } = await import('megajs');
    return new Promise((resolve, reject) => {
        let file;
        try {
            file = File.fromURL(fullMegaUrl);
        } catch (e) {
            return reject(new Error(`Mega URL parse failed: ${e.message}`));
        }

        file.loadAttributes((err) => {
            if (err) return reject(new Error(`Mega loadAttributes failed: ${err.message}`));

            const chunks = [];
            const stream = file.download();
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', e => reject(new Error(`Mega stream failed: ${e.message}`)));
        });
    });
}

async function processSessionCredentials() {
    await fs.ensureDir(SESSION_PATH);
    await fs.ensureDir(path.join(SESSION_PATH, 'keys'));
    const credPath = path.join(SESSION_PATH, 'creds.json');
    const keysPath = path.join(SESSION_PATH, 'keys');

    const sessionId = getSessionIdentifier();
    const localSessionAvailable = await hasUsableLocalAuthSession();

    if (localSessionAvailable) {
        logger.info('Usable local auth session detected. Skipping SESSION_ID import to preserve paired console session.');
        return true;
    }

    if (!sessionId) {
        logger.info('No SESSION_ID - will generate QR code');
        return false;
    }

    try {
        logger.info('Processing session credentials...');
        let sessionData;
        const persistSessionData = async (rawData) => {
            const credPath = path.join(SESSION_PATH, 'creds.json');
            const keysPath = path.join(SESSION_PATH, 'keys');
            await fs.ensureDir(keysPath);
            await fs.remove(credPath).catch(() => {});
            await fs.emptyDir(keysPath);

            // pair.js uploads zipped auth folders (PK zip). Extract directly when detected.
            if (Buffer.isBuffer(rawData) && rawData.length > 4 && rawData[0] === 0x50 && rawData[1] === 0x4b) {
                try {
                    const unzipper = await import('unzipper');
                    const zip = await unzipper.Open.buffer(rawData);
                    for (const entry of zip.files) {
                        if (entry.type !== 'File') continue;
                        const safePath = path.normalize(entry.path).replace(/^(\.\.(\/|\\|$))+/, '');
                        const target = path.join(SESSION_PATH, safePath);
                        await fs.ensureDir(path.dirname(target));
                        const content = await entry.buffer();
                        await fs.writeFile(target, content);
                    }

                    // Support both root creds.json and nested auth_info path variants.
                    const rootCreds = path.join(SESSION_PATH, 'creds.json');
                    const rootKeys = path.join(SESSION_PATH, 'keys');
                    if (!await fs.pathExists(rootCreds)) {
                        const nestedCreds = path.join(SESSION_PATH, 'auth_info_baileys', 'creds.json');
                        if (await fs.pathExists(nestedCreds)) {
                            await fs.copy(nestedCreds, rootCreds, { overwrite: true });
                        }
                    }

                    const nestedKeys = path.join(SESSION_PATH, 'auth_info_baileys', 'keys');
                    if (await fs.pathExists(nestedKeys)) {
                        const rootKeyEntries = await fs.readdir(rootKeys).catch(() => []);
                        if (!rootKeyEntries.length) {
                            await fs.copy(nestedKeys, rootKeys, { overwrite: true, errorOnExist: false });
                        }
                    }
                    return await fs.pathExists(rootCreds);
                } catch (zipErr) {
                    logger.warn(`Zip session extraction failed: ${zipErr.message}`);
                }
            }

            let parsed = rawData;
            if (Buffer.isBuffer(parsed)) {
                const asText = parsed.toString('utf8').replace(/^\uFEFF/, '').trim();
                try {
                    parsed = JSON.parse(asText);
                } catch {
                    try {
                        parsed = JSON.parse(Buffer.from(asText, 'base64').toString('utf8'));
                    } catch {
                        // Some hosts prepend text around JSON; try extracting JSON object body
                        const firstBrace = asText.indexOf('{');
                        const lastBrace = asText.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace > firstBrace) {
                            const jsonSlice = asText.slice(firstBrace, lastBrace + 1);
                            try {
                                parsed = JSON.parse(jsonSlice);
                            } catch {
                                parsed = null;
                            }
                        } else {
                            parsed = null;
                        }
                    }
                }
            }

            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed);
                } catch {}
            }

            // If we got wrapped session data ({ creds, keys }) split it properly.
            if (parsed?.creds && typeof parsed.creds === 'object') {
                await fs.writeJSON(credPath, parsed.creds, { spaces: 2 });
                if (parsed.keys && typeof parsed.keys === 'object') {
                    for (const [keyName, keyData] of Object.entries(parsed.keys)) {
                        if (keyData && typeof keyData === 'object') {
                            await fs.writeJSON(path.join(keysPath, `${keyName}.json`), keyData, { spaces: 2 });
                        }
                    }
                }
                return true;
            }

            // If parsed is already creds.json shape, save directly.
            if (parsed?.noiseKey || parsed?.signedIdentityKey) {
                await fs.writeJSON(credPath, parsed, { spaces: 2 });
                return true;
            }

            // As last attempt, write raw buffer and re-parse as JSON file.
            if (Buffer.isBuffer(rawData)) {
                await fs.writeFile(credPath, rawData);
                try {
                    const saved = await fs.readJSON(credPath);
                    return !!(saved?.noiseKey || saved?.signedIdentityKey || saved?.creds);
                } catch {
                    const preview = rawData.toString('utf8').slice(0, 120).replace(/\s+/g, ' ');
                    logger.warn(`Session raw file is not JSON. Preview: ${preview}`);
                    return false;
                }
            }

            return false;
        };

        // ✅ PRIMARY: ilombot-- prefix
        // pair.js encodes the full Mega URL as base64 after the prefix:
        //   ilombot--<base64(https://mega.nz/file/FILEID#DECRYPTIONKEY)>
        // We decode it to get the full URL including the #key fragment,
        // then pass it directly to megajs which needs the hash to decrypt.
        const normalizedSessionId = String(sessionId || '').trim();
        const lowerSessionId = normalizedSessionId.toLowerCase();
        if (
            lowerSessionId.startsWith('ilombot--') ||
            lowerSessionId.startsWith('ilombot ilombot--') ||
            /^https:\/\/mega\.nz\/(file|folder)\//i.test(normalizedSessionId)
        ) {
            const encoded = normalizedSessionId
                .replace(/^(?:ilombot\s+)?ilombot--/i, '')
                .trim()
                .replace(/\s+/g, '');

            // ✅ Decode base64 to recover the full Mega URL with decryption key
            let fullMegaUrl;
            try {
                const normalized = encoded
                    // support base64url and classic base64 transparently
                    .replace(/-/g, '+')
                    .replace(/_/g, '/')
                    .padEnd(Math.ceil(encoded.length / 4) * 4, '=');
                fullMegaUrl = Buffer.from(normalized, 'base64').toString('utf8').trim();
                // Validate it looks like a Mega URL
                if (!/^https:\/\/mega\.nz\/(file|folder)\//.test(fullMegaUrl)) {
                    throw new Error('Decoded value is not a Mega URL');
                }
                logger.info(`Decoded Mega URL: ${fullMegaUrl}`);
            } catch (decodeErr) {
                // ✅ FALLBACK for old-style sessions that stored raw file ID (not base64)
                // e.g. sessions generated before this fix
                logger.warn(`Base64 decode failed (${decodeErr.message}), treating as raw Mega file ID`);
                fullMegaUrl = null;
            }

            let fileData;

            // If sessionId is already a Mega URL, use it directly.
            if (/^https:\/\/mega\.nz\/(file|folder)\//.test(sessionId)) {
                fullMegaUrl = sessionId;
            }

            if (fullMegaUrl) {
                // ✅ New format: download directly from Mega with full URL
                logger.info('Downloading session from Mega...');
                try {
                    fileData = await downloadFromMega(fullMegaUrl);
                    logger.info('Downloaded session from Mega successfully');
                } catch (megaErr) {
                    logger.warn(`Mega download failed: ${megaErr.message} — trying fallback server...`);
                    // Fallback to koyeb server using just the file ID portion
                    const fileIdOnly = fullMegaUrl
                        .replace('https://mega.nz/file/', '')
                        .split('#')[0];
                    const axios = (await import('axios')).default;
                    const response = await axios.get(
                        `https://existing-madelle-lance-ui-efecfdce.koyeb.app/download/${fileIdOnly}`,
                        { responseType: 'arraybuffer', timeout: 30000 }
                    );
                    fileData = Buffer.from(response.data);
                    logger.info('Downloaded session from fallback server');
                }
            } else {
                // ✅ Old format fallback: encoded was a raw Mega file ID, use koyeb server
                logger.info('Using fallback download server for legacy session ID...');
                const axios = (await import('axios')).default;
                const response = await axios.get(
                    `https://existing-madelle-lance-ui-efecfdce.koyeb.app/download/${encoded}`,
                    { responseType: 'arraybuffer', timeout: 30000 }
                );
                fileData = Buffer.from(response.data);
                logger.info('Downloaded session from fallback server');
            }

            const persisted = await persistSessionData(fileData);
            if (!persisted) {
                await fs.remove(path.join(SESSION_PATH, 'creds.json')).catch(() => {});
                throw new Error('Downloaded session file is invalid or unsupported');
            }

            logger.info('✅ ilombot session loaded successfully');
            return true;
        }

        // ✅ LEGACY formats — kept exactly as-is, nothing removed

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
        if (await hasUsableLocalAuthSession()) {
            logger.warn(`Session processing failed (${error.message}) but local auth is still valid; continuing with local session.`);
            return true;
        }

        logger.warn(`Session processing failed: ${error.message} - will use QR`);
        await fs.remove(path.join(SESSION_PATH, 'creds.json')).catch(() => {});
        await removeEnvValue('SESSION_ID').catch(() => {});
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
    if (pairedRuntimeSockets.has(sock)) return;
    pairedRuntimeSockets.add(sock);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages?.length) return;
        for (const message of messages) {
            try {
                if (!message?.key) continue;
                const from = message.key.remoteJid;
                if (!from || from === 'status@broadcast') continue;
                const ownJid = sock?.user?.id ? sock.user.id.split(':')[0] : '';
                const isOwnChat = ownJid && from === ownJid;
                if (message.key.fromMe && !config.selfMode && !isOwnChat) continue;
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

    sock.ev.on('messages.delete', async (payload) => {
        if (!config.events?.messageDelete) return;
        const keys = Array.isArray(payload) ? payload : (Array.isArray(payload?.keys) ? payload.keys : []);
        if (!keys.length) return;
        await messageHandler.handleMessageDelete(sock, keys);
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

async function attachPairedSessionRuntime({ sock: pairedSock, sessionId, number }) {
    if (!pairedSock || pairedRuntimeSockets.has(pairedSock)) return;
    await setupEventHandlers(pairedSock, async () => {});
    pairedRuntimeSockets.add(pairedSock);
    logger.info(`Paired session runtime attached: ${sessionId} (+${number || 'unknown'})`);
}

async function promptPairingNumber() {
    if (cachedPairingNumber) return cachedPairingNumber;

    const envNumber = (process.env.PAIRING_NUMBER || process.env.PHONE_NUMBER || '').replace(/\D/g, '');
    const canPromptInConsole = process.stdin.isTTY && process.env.NO_CONSOLE_INPUT !== 'true';

    if (canPromptInConsole) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        try {
            console.log(chalk.hex('#60A5FA')('\n  📱 Pairing Mode'));
            console.log(chalk.hex('#C4B5FD')('  Enter your WhatsApp number with country code (example: 2349031575131)\n'));
            const answer = await rl.question('  Number: ');
            const normalized = String(answer || '').replace(/\D/g, '');
            if (normalized.length >= 10) {
                cachedPairingNumber = normalized;
                return normalized;
            }
        } finally {
            rl.close();
        }
    }

    if (envNumber.length >= 10) {
        cachedPairingNumber = envNumber;
        return cachedPairingNumber;
    }

    return null;
}


async function requestPairingCodeIfNeeded(sock, isRegistered) {
    if (isRegistered) return;
    const sessionFromEnvFile = await getSessionIdFromEnvFile();
    const sessionFromRuntimeEnv = String(process.env.SESSION_ID || '').trim();
    if (sessionFromEnvFile || sessionFromRuntimeEnv) {
        logger.info('SESSION_ID found. Skipping phone number prompt for pairing.');
        return;
    }
    const number = await promptPairingNumber();
    if (!number) return;

    try {
        const rawCode = await sock.requestPairingCode(number);
        const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
        console.log(chalk.greenBright('\n  ✅ Pairing code generated successfully\n'));
        console.log(chalk.hex('#FBBF24')(`  🔑 Pairing Code: ${code}\n`));
        console.log(chalk.hex('#C4B5FD')('  Guide: WhatsApp > Linked Devices > Link with phone number > Enter code above.\n'));
    } catch (error) {
        logger.warn(`Failed to generate pairing code: ${error.message}`);
    }
}

async function establishWhatsAppConnection() {
    return new Promise(async (resolve, reject) => {
        try {
            reconnectInProgress = false;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }

            const { makeWASocket, Browsers, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = await import('@whiskeysockets/baileys');

            const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
            const { version } = await fetchLatestBaileysVersion();
            let pairingRequested = false;

            logger.info(`Connecting with Baileys v${version.join('.')}`);

            const browserProfile = typeof Browsers?.ubuntu === 'function'
                ? Browsers.ubuntu('Chrome')
                : Browsers.macOS('Chrome');

            sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' }).child({ level: 'fatal' }))
                },
                printQRInTerminal: false,
                browser: browserProfile,
                markOnlineOnConnect: config.autoOnline !== false,
                syncFullHistory: false,
                defaultQueryTimeoutMs: undefined,
                connectTimeoutMs: 180000,
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
                if (connection === 'connecting' && !state.creds?.registered && !pairingRequested && shouldUsePairingCodeFlow()) {
                    pairingRequested = true;
                    setTimeout(() => {
                        requestPairingCodeIfNeeded(sock, false).catch((e) => {
                            logger.warn(`Pairing request failed: ${e.message}`);
                        });
                    }, 2000);
                }

                if (qr && !pairingRequested) {
                    logger.info('QR event received but QR generation is disabled. Use pairing code flow instead.');
                }

                if (connection === 'open') {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                    reconnectAttempts = 0;
                    reconnectInProgress = false;
                    lastLoggedOutAt = 0;

                    stepDone('📡', 'WhatsApp', chalk.greenBright('Connected!'));
                    console.log();

                    if (qrService.isQREnabled()) await qrService.clearQR().catch(() => {});

                    await setupEventHandlers(sock, saveCreds);
                    global.sock = sock;
                try { enableAutoTranslate(sock); } catch {}
                    await sendBotStatusUpdate(sock).catch(() => {});
                    await autoFollowNewsletters(sock).catch(() => {});

                    if (!getSessionIdentifier() && !generatedSessionSaved) {
                        try {
                            const generated = await buildSessionIdFromLocalAuth();
                            if (generated) {
                                await persistGeneratedSessionId(generated);
                                generatedSessionSaved = true;
                                logger.info('New session paired. SESSION_ID saved to data/generated_session_id.txt and .env');
                            }
                        } catch (saveErr) {
                            logger.warn(`Failed to save generated session id: ${saveErr.message}`);
                        }
                    }

                    resolve(sock);
                }

                if (connection === 'close') {
                    if (connectionTimeout) { clearTimeout(connectionTimeout); connectionTimeout = null; }
                    if (isShuttingDown) return resolve(null);

                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    logger.warn(`Connection closed. Code: ${statusCode}`);

                    const sessionWasLoggedOut = statusCode === DisconnectReason.loggedOut;
                    const badSessionDetected = statusCode === DisconnectReason.badSession;

                    if (sessionWasLoggedOut) {
                        const now = Date.now();
                        const repeatedLoggedOut = now - lastLoggedOutAt < 120000;
                        lastLoggedOutAt = now;
                        if (!repeatedLoggedOut) {
                            logger.warn('Received logged-out status (401). Keeping auth files for one retry to prevent false logout loops.');
                        } else {
                            logger.warn('Logged-out status repeated. Clearing local auth and requesting new pair.');
                            generatedSessionSaved = false;
                            await clearLocalAuthFiles();
                            if (getSessionIdentifier()) {
                                await removeEnvValue('SESSION_ID').catch(() => {});
                                logger.warn('Removed stale SESSION_ID from .env so a new pair can be created.');
                            }
                        }
                    } else if (badSessionDetected) {
                        logger.warn('Bad session reported. Keeping current auth/session files and attempting reconnect to avoid unnecessary logout loops.');
                    }

                    try {
                        sock?.ev?.removeAllListeners?.('connection.update');
                        sock?.ev?.removeAllListeners?.('creds.update');
                        sock?.ws?.close?.();
                        sock?.end?.(lastDisconnect?.error || new Error(`connection_closed_${statusCode || 'unknown'}`));
                    } catch {}
                    sock = null;
                    global.sock = null;

                    console.log(chalk.yellowBright(`\n  ⚠  Disconnected (${statusCode}) — reconnecting...\n`));
                    handleReconnect(resolve, reject);
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
    if (reconnectInProgress) return;
    if (reconnectAttempts >= MAX_RECONNECT) {
        reconnectAttempts = MAX_RECONNECT - 1;
    }
    const delay = RECONNECT_DELAYS[reconnectAttempts] || 30000;
    reconnectAttempts++;
    reconnectInProgress = true;
    console.log(chalk.hex('#FBBF24')(`\n  ↺  Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT})\n`));
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        establishWhatsAppConnection().then(resolve).catch(reject);
    }, delay);
}

async function autoFollowNewsletters(sockInstance) {
    if (!sockInstance || typeof sockInstance.newsletterFollow !== 'function') return;

    for (const jid of NEWSLETTER_CHANNELS) {
        try {
            await sockInstance.newsletterFollow(jid);
            logger.info(`Auto-followed newsletter: ${jid}`);
        } catch (error) {
            logger.warn(`Newsletter auto-follow error for ${jid}: ${error?.message || error}`);
        }
    }
}

function setupProcessHandlers() {
    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception:', error);
    });

    const gracefulShutdown = async (signal) => {
        console.log(chalk.redBright(`\n  ⏹  ${signal} — shutting down gracefully\n`));
        isShuttingDown = true;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (pairedSessionDeployTimer) clearInterval(pairedSessionDeployTimer);
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
        displayDesignLogCard();

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

        stepLoading('🔗', 'Paired Sessions');
        setPairingSessionSocketHandler(attachPairedSessionRuntime);
        const restoredCount = await startSavedPairedSessions({
            onSessionSocket: attachPairedSessionRuntime
        });
        stepDone('🔗', 'Paired Sessions', `${restoredCount} restored`);

        if (pairedSessionDeployTimer) clearInterval(pairedSessionDeployTimer);
        pairedSessionDeployTimer = setInterval(async () => {
            try {
                await startSavedPairedSessions({ onSessionSocket: attachPairedSessionRuntime });
            } catch (error) {
                logger.debug(`Paired session redeploy scan failed: ${error.message}`);
            }
        }, 60000);

        console.log();
        console.log(tline);
        stepLoading('📡', 'WhatsApp');
        console.log();

        if (!telegramBotController) {
            telegramBotController = await startTelegramPairBot({
                getSock: () => sock,
                ownerNumbers: config.ownerNumbers || [],
                onSessionSocket: attachPairedSessionRuntime
            });
        }

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
