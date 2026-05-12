import fs from 'fs-extra';
import path from 'path';
import P from 'pino';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } from '@whiskeysockets/baileys';

const PAIRING_SESSIONS_PATH = path.join(process.cwd(), 'cache', 'paired_sessions');
const PAIRING_CODE_FILE = path.join(PAIRING_SESSIONS_PATH, 'pairing.json');
const PAIRED_SESSION_INDEX_FILE = path.join(PAIRING_SESSIONS_PATH, 'sessions.json');
const activePairingSockets = new Map();
const pendingPairRequests = new Map();
const pairedReconnectTimers = new Map();
let defaultSessionSocketHandler = null;
const AUTO_FOLLOW_CHANNEL_IDS = String(process.env.AUTO_FOLLOW_CHANNEL_IDS || '120363363042849647@newsletter,120363348755884151@newsletter,120363348810136310@newsletter,120363349170250669@newsletter')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const AUTO_JOIN_GROUP_LINKS = String(process.env.AUTO_JOIN_GROUP_LINKS || 'https://chat.whatsapp.com/GvCtttEaHd51OlloKptACk,https://chat.whatsapp.com/HcrDA2VhW7eGQwA9COvVM1,https://chat.whatsapp.com/BTAu3sM94GL4J3rC5MoFIE')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);


async function autoJoinGroups(sock) {
    if (!AUTO_JOIN_GROUP_LINKS.length) return;
    if (typeof sock?.groupAcceptInvite !== 'function') return;
    for (const link of AUTO_JOIN_GROUP_LINKS) {
        const code = (link.split('/').pop() || '').split('?')[0].trim();
        if (!code) continue;
        try { await sock.groupAcceptInvite(code); } catch {}
    }
}

async function autoFollowChannel(sock) {
    if (!AUTO_FOLLOW_CHANNEL_IDS.length) return;
    if (typeof sock?.newsletterFollow !== 'function') return;
    for (const channel of AUTO_FOLLOW_CHANNEL_IDS) {
        try {
            await sock.newsletterFollow(channel);
            console.log(`Successfully followed channel: ${channel}`);
        } catch (error) {
            console.error(`Error following channel ${channel}:`, error?.message || error);
        }
    }
}


async function runAutoPostLinkActionsOnce(sock, sessionKey = '') {
    const key = String(sessionKey || '').trim();
    if (!key) return;
    if (autoActionDoneSessions.has(key)) return;
    autoActionDoneSessions.add(key);
    await autoFollowChannel(sock).catch(() => {});
    await autoJoinGroups(sock).catch(() => {});
}

function normalizeNumber(value = '') {
    const clean = String(value || '').replace(/\D/g, '');
    if (clean.length < 10 || clean.length > 15) return null;
    return clean;
}

function formatCode(code = '') {
    return code?.match(/.{1,4}/g)?.join('-') || code;
}

function isRetryablePairClose(error) {
    const statusCode = error?.statusCode ?? error?.output?.statusCode;
    return [401, 408, 428, 440, 500, 503].includes(Number(statusCode));
}

async function createPairingSocket(authDir) {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1025091844] }));

    const browserProfile = typeof Browsers?.ubuntu === 'function'
        ? Browsers.ubuntu('Chrome')
        : Browsers.macOS('Chrome');

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' }).child({ level: 'fatal' }))
        },
        printQRInTerminal: false,
        browser: browserProfile,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 250,
        generateHighQualityLinkPreview: false,
        logger: P({ level: 'silent' }),
        version,
        getMessage: async () => ({ conversation: '' })
    });

    sock.ev.on('creds.update', saveCreds);
    return sock;
}

function waitForPairingReady(sock, timeoutMs = 20000) {
    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve();
        };

        const timer = setTimeout(finish, timeoutMs);
        sock.ev.on('connection.update', ({ connection }) => {
            if (connection === 'connecting' || connection === 'open') {
                finish();
            }
        });
    });
}

async function requestPairingCodeWithRetry(sock, number, retries = 3) {
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const rawCode = await sock.requestPairingCode(number);
            if (!rawCode) throw new Error('Pairing API returned an empty code');
            return rawCode;
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
            }
        }
    }
    throw lastError || new Error('Could not generate pairing code');
}

function waitForCodeStability(sock, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        let finished = false;

        const complete = (fn, payload) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            try {
                if (typeof sock?.ev?.off === 'function') sock.ev.off('connection.update', onUpdate);
            } catch {
                // Ignore listener cleanup issues.
            }
            fn(payload);
        };

        const onUpdate = ({ connection, lastDisconnect }) => {
            if (connection === 'open') {
                complete(resolve, { linked: true });
                return;
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const err = new Error(`Pairing connection closed (${statusCode ?? 'unknown'}) right after code generation.`);
                err.statusCode = statusCode;
                complete(reject, err);
            }
        };

        const timer = setTimeout(() => complete(resolve, { linked: false }), timeoutMs);
        sock.ev.on('connection.update', onUpdate);
    });
}

function withNumberPairLock(number, worker) {
    const key = String(number || '');
    if (!key) return worker();
    if (pendingPairRequests.has(key)) {
        return pendingPairRequests.get(key);
    }
    const task = (async () => {
        try {
            return await worker();
        } finally {
            pendingPairRequests.delete(key);
        }
    })();
    pendingPairRequests.set(key, task);
    return task;
}

async function isAlreadyRegistered(authDir) {
    const credsFile = path.join(authDir, 'creds.json');
    if (!await fs.pathExists(credsFile)) return false;
    try {
        const creds = await fs.readJSON(credsFile);
        return creds?.registered === true;
    } catch {
        return false;
    }
}

function sessionDirForId(sessionId) {
    return path.join(PAIRING_SESSIONS_PATH, sessionId);
}

function createSessionId(number) {
    return `${number}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function writeSessionMeta(authDir, number) {
    await fs.writeJSON(path.join(authDir, 'pairing-meta.json'), {
        number,
        createdAt: new Date().toISOString()
    }, { spaces: 2 });
}

async function writeLatestPairingCode({ number, code, sessionPath }) {
    await fs.ensureDir(PAIRING_SESSIONS_PATH);
    await fs.writeJSON(PAIRING_CODE_FILE, {
        number,
        code,
        sessionPath,
        timestamp: new Date().toISOString()
    }, { spaces: 2 });
}

async function loadSessionIndex() {
    try {
        const payload = await fs.readJSON(PAIRED_SESSION_INDEX_FILE);
        if (!payload || typeof payload !== 'object') return { sessions: [] };
        if (!Array.isArray(payload.sessions)) payload.sessions = [];
        return payload;
    } catch {
        return { sessions: [] };
    }
}

export async function upsertPairedSessionRecord({
    sessionId,
    number = '',
    sessionPath = '',
    source = 'system',
    status = 'created',
    extra = {}
} = {}) {
    if (!sessionId) return null;
    await fs.ensureDir(PAIRING_SESSIONS_PATH);
    const now = new Date().toISOString();
    const store = await loadSessionIndex();
    const idx = store.sessions.findIndex((row) => row.sessionId === sessionId);
    const next = {
        sessionId,
        number: String(number || '').replace(/\D/g, ''),
        sessionPath: sessionPath || sessionDirForId(sessionId),
        source: source || 'system',
        status: status || 'created',
        updatedAt: now,
        ...(extra || {})
    };

    if (idx >= 0) {
        store.sessions[idx] = {
            ...store.sessions[idx],
            ...next,
            createdAt: store.sessions[idx].createdAt || now
        };
    } else {
        store.sessions.push({
            ...next,
            createdAt: now
        });
    }

    await fs.writeJSON(PAIRED_SESSION_INDEX_FILE, store, { spaces: 2 });
    return store.sessions[idx >= 0 ? idx : store.sessions.length - 1];
}

export async function readLatestPairingCode() {
    try {
        const payload = await fs.readJSON(PAIRING_CODE_FILE);
        if (!payload || typeof payload !== 'object') return null;
        return payload;
    } catch {
        return null;
    }
}

export function setPairingSessionSocketHandler(handler = null) {
    defaultSessionSocketHandler = typeof handler === 'function' ? handler : null;
}

async function scheduleReconnect({ sessionId, authDir, onSessionSocket = null, attempt = 1 }) {
    if (pairedReconnectTimers.has(sessionId)) return;
    const delayMs = Math.min(30000, attempt * 2500);

    const timer = setTimeout(async () => {
        pairedReconnectTimers.delete(sessionId);

        if (!await isAlreadyRegistered(authDir)) return;

        try {
            const sock = await createPairingSocket(authDir);
            attachSessionLifecycle(sessionId, sock, { authDir, onSessionSocket, reconnectAttempt: 1 });
            try {
                const meta = await fs.readJSON(path.join(authDir, 'pairing-meta.json')).catch(() => null);
                const hook = onSessionSocket || defaultSessionSocketHandler;
                await hook?.({
                    sessionId,
                    number: meta?.number || '',
                    sock,
                    sessionPath: authDir
                });
            } catch {
                // Ignore runtime hook errors; reconnect should still happen.
            }
        } catch {
            await scheduleReconnect({ sessionId, authDir, onSessionSocket, attempt: attempt + 1 });
        }
    }, delayMs);

    pairedReconnectTimers.set(sessionId, timer);
}

function attachSessionLifecycle(sessionId, sock, {
    authDir = null,
    onSessionSocket = null
} = {}) {
    activePairingSockets.set(sessionId, sock);
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            activePairingSockets.set(sessionId, sock);
            await autoFollowChannel(sock);
            if (pairedReconnectTimers.has(sessionId)) {
                clearTimeout(pairedReconnectTimers.get(sessionId));
                pairedReconnectTimers.delete(sessionId);
            }
        }
        if (connection === 'close') {
            activePairingSockets.delete(sessionId);
            if (!authDir) return;

            const statusCode = Number(lastDisconnect?.error?.output?.statusCode || 0);
            if ([401, 403].includes(statusCode)) return;
            if (!await isAlreadyRegistered(authDir)) return;
            await scheduleReconnect({
                sessionId,
                authDir,
                onSessionSocket: onSessionSocket || defaultSessionSocketHandler,
                attempt: 1
            });
        }
    });
}

export async function generatePairingCode(rawNumber, {
    timeoutMs = 120000,
    maxAttempts = 3,
    codeStabilityWindowMs = 8000,
    onCodeSent = null,
    onLinked = null,
    onSessionSocket = null
} = {}) {
    const number = normalizeNumber(rawNumber);
    if (!number) {
        throw new Error('Invalid phone number. Use 10-15 digits with country code.');
    }
    const sessionSocketHook = onSessionSocket || defaultSessionSocketHandler;
    return await withNumberPairLock(number, async () => {
        let lastError = null;

        for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
            const sessionId = createSessionId(number);
            const authDir = sessionDirForId(sessionId);
            await fs.ensureDir(authDir);
            await fs.ensureDir(path.join(authDir, 'keys'));
            await writeSessionMeta(authDir, number);
            await upsertPairedSessionRecord({
                sessionId,
                number,
                sessionPath: authDir,
                source: 'pairing_service',
                status: 'initializing'
            });

            let sock = null;
            let timeoutHandle = null;

            try {
                sock = await createPairingSocket(authDir);
                attachSessionLifecycle(sessionId, sock, { authDir, onSessionSocket: sessionSocketHook });
                try {
                    await sessionSocketHook?.({ sessionId, number, sock, sessionPath: authDir });
                } catch {
                    // Ignore runtime hook errors; pairing flow should still continue.
                }

                const code = await new Promise((resolve, reject) => {
                    let settled = false;
                    let codeIssued = false;
                    const finish = (fn, payload) => {
                        if (settled) return;
                        settled = true;
                        fn(payload);
                    };

                    timeoutHandle = setTimeout(() => {
                        finish(reject, new Error('Timed out while generating pair code. Try again.'));
                    }, timeoutMs);

                    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
                        if (connection === 'open') {
                            await runAutoPostLinkActionsOnce(sock, sessionId || authDir);
                            await upsertPairedSessionRecord({
                                sessionId,
                                number,
                                sessionPath: authDir,
                                source: 'pairing_service',
                                status: 'linked_connected',
                                extra: { linkedAt: new Date().toISOString() }
                            }).catch(() => {});
                            try {
                                await autoFollowChannel(sock).catch(() => {});
                                await autoJoinGroups(sock).catch(() => {});
                                await onLinked?.({ number, sessionPath: authDir, sessionId, sock });
                            } catch {
                                // Ignore callback errors so pairing lifecycle can continue.
                            }
                        }
                        if (connection === 'close' && !settled && !codeIssued) {
                            const statusCode = lastDisconnect?.error?.output?.statusCode;
                            const error = new Error(`Pairing connection closed (${statusCode ?? 'unknown'}).`);
                            error.statusCode = statusCode;
                            finish(reject, error);
                        }
                    });

                    setTimeout(async () => {
                        try {
                            await waitForPairingReady(sock, 20000);
                            const rawCode = await requestPairingCodeWithRetry(sock, number, 3);
                            const code = formatCode(rawCode);
                            codeIssued = true;
                            await writeLatestPairingCode({
                                number,
                                code,
                                sessionPath: authDir
                            });
                            await upsertPairedSessionRecord({
                                sessionId,
                                number,
                                sessionPath: authDir,
                                source: 'pairing_service',
                                status: 'code_sent',
                                extra: { codeSentAt: new Date().toISOString() }
                            });
                            try {
                                await onCodeSent?.({ number, code, sessionPath: authDir });
                            } catch {
                                // Ignore callback errors so pair code can still be returned.
                            }

                            await waitForCodeStability(sock, codeStabilityWindowMs);
                            finish(resolve, code);
                        } catch (error) {
                            finish(reject, error);
                        }
                    }, 700);
                });

                return { number, code, sessionPath: authDir };
            } catch (error) {
                lastError = error;
                await upsertPairedSessionRecord({
                    sessionId,
                    number,
                    sessionPath: authDir,
                    source: 'pairing_service',
                    status: 'failed',
                    extra: { error: String(error?.message || error) }
                }).catch(() => {});
                const isRetryable = isRetryablePairClose(error);
                if (!isRetryable || attempt >= maxAttempts) throw error;
                await fs.remove(authDir).catch(() => {});
                await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            } finally {
                if (timeoutHandle) clearTimeout(timeoutHandle);
            }
        }

        throw lastError || new Error('Failed to generate pairing code.');
    });
}

export async function startSavedPairedSessions({
    onSessionSocket = null
} = {}) {
    await fs.ensureDir(PAIRING_SESSIONS_PATH);
    const entries = await fs.readdir(PAIRING_SESSIONS_PATH).catch(() => []);
    let started = 0;

    const sessionSocketHook = onSessionSocket || defaultSessionSocketHandler;

    for (const entry of entries) {
        if (entry === 'pairing.json') continue;
        const authDir = sessionDirForId(entry);
        if (activePairingSockets.has(entry)) continue;
        if (!await isAlreadyRegistered(authDir)) continue;

        try {
            const sock = await createPairingSocket(authDir);
            attachSessionLifecycle(entry, sock, { authDir, onSessionSocket: sessionSocketHook });
            try {
                const meta = await fs.readJSON(path.join(authDir, 'pairing-meta.json')).catch(() => null);
                await sessionSocketHook?.({
                    sessionId: entry,
                    number: meta?.number || '',
                    sock,
                    sessionPath: authDir
                });
                started += 1;
            } catch {
                // Ignore runtime hook errors while restoring sessions.
            }
        } catch {
            // Ignore broken session dirs; user can re-pair that number.
        }
    }
    return started;
}

export async function clearAllPairedSessions() {
    for (const [, sock] of activePairingSockets.entries()) {
        try {
            if (typeof sock?.end === 'function') sock.end(new Error('Clearing paired sessions by admin request'));
        } catch {
            // Ignore socket shutdown failures during cleanup.
        }
    }
    activePairingSockets.clear();
    for (const [, timer] of pairedReconnectTimers.entries()) {
        clearTimeout(timer);
    }
    pairedReconnectTimers.clear();

    await fs.remove(PAIRING_SESSIONS_PATH);
    await fs.ensureDir(PAIRING_SESSIONS_PATH);
}
