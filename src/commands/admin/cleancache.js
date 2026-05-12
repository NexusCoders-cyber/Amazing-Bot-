import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getDirSize(dirPath) {
    try {
        let total = 0;
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const e of entries) {
            const fp = path.join(dirPath, e.name);
            if (e.isDirectory()) total += await getDirSize(fp);
            else if (e.isFile()) total += (await fs.stat(fp)).size;
        }
        return total;
    } catch { return 0; }
}

async function cleanDir(dirPath) {
    try {
        if (!await fs.pathExists(dirPath)) return { files: 0, bytes: 0 };
        const sizeBefore = await getDirSize(dirPath);
        await fs.remove(dirPath);
        await fs.ensureDir(dirPath);
        return { files: 0, bytes: sizeBefore };
    } catch { return { files: 0, bytes: 0 }; }
}

export default {
    name: 'cleancache',
    aliases: ['cleartemp', 'cleandownloads', 'cleanup'],
    category: 'admin',
    description: 'Clean all cached/temp files to free storage',
    usage: 'cleancache',
    cooldown: 10,
    args: false,
    minArgs: 0,

    async execute({ sock, message, from }) {
        await sock.sendMessage(from, { react: { text: '🧹', key: message.key } });

        const targets = [
            path.join(__dirname, '../../cache'),
            path.join(__dirname, '../../temp'),
            path.join(__dirname, '../../media'),
            path.join(__dirname, '../../public/temp')
        ];

        let totalFreed = 0;
        let cleaned = 0;

        for (const dir of targets) {
            const result = await cleanDir(dir);
            if (result.bytes > 0) {
                totalFreed += result.bytes;
                cleaned++;
            }
        }

        if (totalFreed > 0) {
            await sock.sendMessage(from, {
                text: `🧹 *Cache Cleaned*\n\n✅ Freed *${formatBytes(totalFreed)}* of space\n📂 Cleaned ${cleaned} directories`
            }, { quoted: message });
        } else {
            await sock.sendMessage(from, {
                text: '🧹 *Cache Cleaned*\n\n✅ No cached files to clean.'
            }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
    }
};
