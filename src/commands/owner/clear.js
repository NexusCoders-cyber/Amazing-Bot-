import fs from 'fs-extra';
import path from 'path';

const DEFAULT_TARGETS = [
    'temp',
    'downloads',
    'cache',
    'logs',
    path.join('data', 'tmp')
];
const PROTECTED_PATHS = [
    path.join('data', 'sessions'),
    path.join('data', 'auth_info_baileys'),
    path.join('data', 'creds.json'),
    path.join('session'),
    path.join('sessions'),
    path.join('backups', 'session'),
    path.join('.wwebjs_auth')
].map((p) => path.join(process.cwd(), p));

async function clearDir(abs) {
    if (!(await fs.pathExists(abs))) return { removed: 0, size: 0 };
    const entries = await fs.readdir(abs);
    let removed = 0;
    let size = 0;

    for (const entry of entries) {
        const target = path.join(abs, entry);
        const lowerTarget = path.normalize(target).toLowerCase();
        const protectedHit = PROTECTED_PATHS.some((p) => lowerTarget.startsWith(path.normalize(p).toLowerCase()))
            || /(^|[/\\])session(s)?([/\\]|$)/i.test(lowerTarget)
            || /auth(_info)?_?baileys/i.test(lowerTarget)
            || /creds\.json$/i.test(lowerTarget);
        if (protectedHit) continue;
        const stat = await fs.stat(target).catch(() => null);
        if (!stat) continue;
        size += stat.size || 0;
        await fs.remove(target);
        removed += 1;
    }

    return { removed, size };
}

export default {
    name: 'clear',
    aliases: ['cleanup', 'clean'],
    category: 'owner',
    description: 'Clear temp/cache/download/log junk without touching active sessions',
    usage: 'clear [all|temp|downloads|cache|logs]',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from }) {
        const mode = (args[0] || 'all').toLowerCase();
        const roots = {
            temp: ['temp'],
            downloads: ['downloads'],
            cache: ['cache'],
            logs: ['logs'],
            all: DEFAULT_TARGETS
        };

        const targets = roots[mode] || roots.all;
        let totalRemoved = 0;
        let totalSize = 0;
        const lines = [];

        for (const rel of targets) {
            const abs = path.join(process.cwd(), rel);
            const result = await clearDir(abs);
            totalRemoved += result.removed;
            totalSize += result.size;
            lines.push(`• ${rel}: ${result.removed} removed`);
        }

        await sock.sendMessage(from, {
            text: `✅ Cleanup done\n\n${lines.join('\n')}\n\nTotal removed: ${totalRemoved}\nApprox freed: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`
        }, { quoted: message });
    }
};
