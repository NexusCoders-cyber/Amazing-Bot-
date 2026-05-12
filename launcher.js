#!/usr/bin/env node

/**
 * Multi-Session Launcher for Asta Bot
 * Spawns one child process per phone number configured in .env
 * Each session gets its own auth directory and port offset
 *
 * Usage:
 *   node launcher.js              → starts all sessions from .env
 *   node launcher.js add <number> → adds a new session
 *   node launcher.js list         → lists all sessions
 */

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import './src/utils/loadEnv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SESSIONS_FILE = path.join(__dirname, 'data', 'sessions.json');
const SESSIONS_DIR = path.join(__dirname, 'cache', 'sessions');

// Ensure directories exist
fs.ensureDirSync(path.dirname(SESSIONS_FILE));
fs.ensureDirSync(SESSIONS_DIR);

function loadSessions() {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
        }
    } catch {}
    return [];
}

function saveSessions(sessions) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

function getBasePort() {
    return parseInt(process.env.BASE_PORT || '5000', 10);
}

console.log(`
╔══════════════════════════════════════╗
║   Asta Bot — Multi-Session       ║
║   Each session runs as child process ║
╚══════════════════════════════════════╝
`);

const args = process.argv.slice(2);
const command = args[0] || 'start';
const argNum = args[1] || '';

if (command === 'pair') {
    // Pair mode: start a single session for pairing
    const sessions = loadSessions();
    const pairNumber = argNum;
    
    if (pairNumber) {
        // Pair a specific number
        console.log(`Starting pairing session for ${pairNumber}...`);
        const clean = pairNumber.replace(/[^0-9]/g, '');
        if (clean.length < 10) {
            console.error('Invalid phone number. Use 10-15 digits with country code.');
            process.exit(1);
        }
        const sessionId = `session_${clean}`;
        const authDir = path.join(SESSIONS_DIR, sessionId);
        fs.ensureDirSync(authDir);
        
        const sessionEnv = {
            ...process.env,
            SESSION_ID: sessionId,
            SESSION_AUTH_DIR: authDir,
            PHONE_NUMBER: clean,
            PAIRING_NUMBER: clean,
            NO_CONSOLE_INPUT: 'false'
        };

        const child = spawn(process.execPath, ['index.js'], {
            cwd: __dirname,
            stdio: 'inherit',
            env: sessionEnv,
            shell: false,
        });

        child.on('close', (code) => {
            console.log(`Pairing session exited with code ${code}`);
            process.exit(code || 0);
        });
    } else {
        console.log('Usage: node launcher.js pair <phone_number>');
        console.log('Example: node launcher.js pair 2349031575131');
        process.exit(0);
    }
    return;
}

if (command === 'list') {
    const sessions = loadSessions();
    console.log(`\nConfigured sessions: ${sessions.length}`);
    sessions.forEach((s, i) => {
        const status = fs.existsSync(path.join(SESSIONS_DIR, s.id, 'creds.json')) ? '✅ Paired' : '⏳ Not paired';
        console.log(`  ${i + 1}. ${s.number} (${s.id}) ${status}`);
    });
    process.exit(0);
}

if (command === 'add') {
    if (!argNum) {
        console.error('Usage: node launcher.js add <phone_number>');
        process.exit(1);
    }
    const sessions = loadSessions();
    const clean = argNum.replace(/[^0-9]/g, '');
    if (sessions.find(s => s.number === clean)) {
        console.error(`Session for ${clean} already exists.`);
        process.exit(1);
    }
    const id = `session_${clean}`;
    sessions.push({ number: clean, id, addedAt: Date.now() });
    saveSessions(sessions);
    fs.ensureDirSync(path.join(SESSIONS_DIR, id));
    console.log(`✅ Added session: ${clean} (${id})`);
    process.exit(0);
}

// Default: start all sessions
const sessions = loadSessions();
const envSessions = (process.env.SESSION_NUMBERS || '').split(',').map(n => n.trim()).filter(Boolean);

// Add comma-separated sessions from env
for (const num of envSessions) {
    const clean = num.replace(/[^0-9]/g, '');
    if (clean && !sessions.find(s => s.number === clean)) {
        const id = `session_${clean}`;
        sessions.push({ number: clean, id, addedAt: Date.now() });
        fs.ensureDirSync(path.join(SESSIONS_DIR, id));
    }
}
if (envSessions.length) saveSessions(sessions);

if (sessions.length === 0) {
    console.log('No sessions configured. Usage:');
    console.log('  node launcher.js add <phone_number>');
    console.log('  Or set SESSION_NUMBERS in .env (comma separated)');
    process.exit(0);
}

console.log(`Starting ${sessions.length} session(s)...\n`);

const childProcesses = [];

for (const session of sessions) {
    const authDir = path.join(SESSIONS_DIR, session.id);
    const port = getBasePort() + childProcesses.length;
    const sessionEnv = {
        ...process.env,
        SESSION_ID: session.id,
        SESSION_AUTH_DIR: authDir,
        PORT: String(port),
        PHONE_NUMBER: session.number,
        BOT_NAME: `${process.env.BOT_NAME || 'Amazing'}-${session.number.slice(-4)}`,
    };

    const child = spawn(process.execPath, ['index.js'], {
        cwd: __dirname,
        stdio: ['pipe', 'inherit', 'inherit'],
        env: sessionEnv,
        shell: false,
    });

    child.on('close', (code) => {
        if (code === 2) {
            console.log(`[${session.id}] Restarting session...`);
            // Will need restart logic
        }
        console.log(`[${session.id}] Exited with code ${code}`);
    });

    child.on('error', (err) => {
        console.error(`[${session.id}] Error: ${err.message}`);
    });

    childProcesses.push({ session, child, port });
    console.log(`  ✅ Launched ${session.number} → PID ${child.pid} :${port}`);
}

console.log(`\nAll sessions running. Press Ctrl+C to stop all.`);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down all sessions...');
    for (const { child } of childProcesses) {
        child.kill('SIGTERM');
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    for (const { child } of childProcesses) {
        child.kill('SIGTERM');
    }
    process.exit(0);
});
