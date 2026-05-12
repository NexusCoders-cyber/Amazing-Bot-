import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'settings', 'message_watch.json');

const DEFAULT_CFG = {
    antidelete: { enabled: false, destination: 'p', targetJid: null, scopes: [] },
    antiedit: { enabled: false, destination: 'p', targetJid: null, scopes: [] }
};

function ensureDir() {
    const dir = path.dirname(FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readAll() {
    try {
        ensureDir();
        if (!fs.existsSync(FILE)) return { ...DEFAULT_CFG };
        const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
        return {
            antidelete: { ...DEFAULT_CFG.antidelete, ...(data?.antidelete || {}) },
            antiedit: { ...DEFAULT_CFG.antiedit, ...(data?.antiedit || {}) }
        };
    } catch {
        return { ...DEFAULT_CFG };
    }
}

function writeAll(payload) {
    ensureDir();
    fs.writeFileSync(FILE, JSON.stringify(payload, null, 2), 'utf8');
}

export function getWatchConfig(type) {
    const all = readAll();
    return all[type] || { ...DEFAULT_CFG.antidelete };
}

export function setWatchConfig(type, cfg) {
    const all = readAll();
    all[type] = {
        enabled: !!cfg.enabled,
        destination: cfg.destination || 'p',
        targetJid: cfg.targetJid || null,
        scopes: Array.isArray(cfg.scopes) ? [...new Set(cfg.scopes)] : []
    };
    writeAll(all);
    return all[type];
}

export function disableWatch(type) {
    return setWatchConfig(type, { enabled: false, destination: 'p', targetJid: null, scopes: [] });
}

export function formatWatchConfig(type) {
    const cfg = getWatchConfig(type);
    if (!cfg.enabled) return `${type} is OFF`;
    const to = cfg.destination === 'g' ? 'same chat' : cfg.destination === 'p' ? 'owner/sudo DM' : cfg.targetJid || 'custom';
    const scopes = cfg.scopes?.length ? cfg.scopes.join(', ') : 'all';
    return `${type} is ON\n• destination: ${to}\n• scopes: ${scopes}`;
}

export function resolvePersonalTarget(config) {
    const first = config?.sudoers?.[0] || config?.ownerNumbers?.[0] || null;
    return first || null;
}

export function shouldPassScope(scopes = [], isGroup) {
    if (!scopes.length) return true;
    const has = (k) => scopes.includes(k);
    if (has('pm')) return !isGroup;
    if (has('gm')) return isGroup;
    if (has('no-pm') && !isGroup) return false;
    if (has('no-gm') && isGroup) return false;
    return true;
}

export function parseWatchArgs(args = []) {
    const a0 = String(args[0] || '').trim().toLowerCase();
    if (!a0) return { error: 'missing' };
    if (a0 === 'off') return { off: true };

    const scope = String(args[1] || '').trim().toLowerCase();
    const validScope = ['pm', 'gm', 'no-pm', 'no-gm'];
    const scopes = validScope.includes(scope) ? [scope] : [];

    if (a0 === 'g' || a0 === 'p') {
        return { enabled: true, destination: a0, targetJid: null, scopes };
    }

    if (a0.includes('@')) {
        return { enabled: true, destination: 'jid', targetJid: a0, scopes };
    }

    const digits = a0.replace(/[^0-9]/g, '');
    if (digits.length >= 7) {
        return { enabled: true, destination: 'jid', targetJid: `${digits}@s.whatsapp.net`, scopes };
    }

    return { error: 'invalid' };
}
