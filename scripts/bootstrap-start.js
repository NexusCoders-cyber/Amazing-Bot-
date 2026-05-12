import { spawnSync } from 'node:child_process';

const CRITICAL_DEPS = ['pino', '@whiskeysockets/baileys', 'express'];

function hasDeps() {
    try {
        for (const dep of CRITICAL_DEPS) {
            import.meta.resolve(dep);
        }
        return true;
    } catch {
        return false;
    }
}

function run(cmd, args) {
    const result = spawnSync(cmd, args, { stdio: 'inherit' });
    return result.status === 0;
}

function installWithRetry(maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`📦 Installing dependencies (attempt ${attempt}/${maxAttempts})...`);
        const ok = run('npm', ['install', '--omit=dev', '--no-audit', '--fund=false']);
        if (ok) return true;

        if (attempt < maxAttempts) {
            const waitMs = attempt * 5000;
            console.log(`⚠️ npm install failed. Retrying in ${waitMs / 1000}s...`);
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
        }
    }
    return false;
}

if (!hasDeps()) {
    console.log('⚠️ Missing dependencies detected. Attempting recovery install...');
    const installed = installWithRetry(3);
    if (!installed) {
        console.error('❌ Failed to install dependencies after retries. Check network/proxy settings.');
        process.exit(1);
    }
}

const started = run('node', ['index.js']);
process.exit(started ? 0 : 1);
