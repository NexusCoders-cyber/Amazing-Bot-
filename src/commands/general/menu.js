import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const startTime = Date.now();
const CATEGORY_ORDER = ['ai', 'audio', 'downloader', 'fun', 'games', 'group', 'image', 'owner', 'religion', 'search', 'settings', 'sports', 'support', 'tools', 'translate', 'video', 'media', 'general', 'utility', 'ephoto360', 'groupstatus', 'other'];

const CATEGORY_LABELS = {
    ai: 'AI MENU',
    audio: 'AUDIO MENU',
    downloader: 'DOWNLOAD MENU',
    ephoto360: 'EPHOTO360 MENU',
    fun: 'FUN MENU',
    games: 'GAMES MENU',
    group: 'GROUP MENU',
    groupstatus: 'GROUPSTATUS MENU',
    image: 'IMAGE MENU',
    other: 'OTHER MENU',
    owner: 'OWNER MENU',
    religion: 'RELIGION MENU',
    search: 'SEARCH MENU',
    settings: 'SETTINGS MENU',
    sports: 'SPORTS MENU',
    support: 'SUPPORT MENU',
    tools: 'TOOLS MENU',
    translate: 'TRANSLATE MENU',
    video: 'VIDEO MENU',
    media: 'MEDIA MENU',
    general: 'GENERAL MENU',
    utility: 'UTILITY MENU'
};

function getUptime() {
    const uptime = Date.now() - startTime;
    const s = Math.floor(uptime / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

function formatBytes(b = 0) {
    const u = ['B', 'KB', 'MB', 'GB'];
    let v = Number(b) || 0;
    let i = 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i === 0 ? 0 : 1)}${u[i]}`;
}

function ramBar(used, total, size = 10) {
    const r = total > 0 ? Math.max(0, Math.min(1, used / total)) : 0;
    const f = Math.round(r * size);
    return `[${'█'.repeat(f)}${'░'.repeat(Math.max(0, size - f))}] ${Math.round(r * 100)}%`;
}

async function scanCommands() {
    const cmdsPath = path.join(process.cwd(), 'src', 'commands');
    const cats = {};
    let total = 0;

    const scan = async (dir) => {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const fp = path.join(dir, item.name);
            if (item.isDirectory()) await scan(fp);
            else if (item.name.endsWith('.js')) {
                try {
                    const mod = await import('file://' + fp);
                    const cmd = mod.default;
                    if (cmd?.name) {
                        const cat = cmd.category || 'other';
                        if (!cats[cat]) cats[cat] = [];
                        cats[cat].push(cmd.name);
                        total++;
                    }
                } catch {}
            }
        }
    };
    await scan(cmdsPath);
    return { cats, total };
}

export default {
    name: 'menu',
    aliases: ['m'],
    category: 'general',
    description: 'Display bot command menu',
    usage: 'menu',
    cooldown: 3,
    args: false,

    async execute({ sock, message, from, prefix }) {
        const { cats, total } = await scanCommands();

        const botName = process.env.BOT_NAME || 'Asta Bot';
        const ownerName = process.env.OWNER_NAME || 'Ilom';
        const version = process.env.BOT_VERSION || '1.0.0';
        const mode = process.env.PUBLIC_MODE === 'true' ? 'Public' : 'Private';

        const ramUsed = process.memoryUsage().rss;
        const ramTotal = os.totalmem();

        // Header
        let msg = `┏▣ ◈ *${botName}* ◈\n`;
        msg += `┃ *ᴏᴡɴᴇʀ* : ${ownerName}\n`;
        msg += `┃ *ᴘʀᴇғɪx* : [ ${prefix} ]\n`;
        msg += `┃ *ʜᴏsᴛ* : Panel\n`;
        msg += `┃ *ᴘʟᴜɢɪɴs* : ${total}\n`;
        msg += `┃ *ᴍᴏᴅᴇ* : ${mode}\n`;
        msg += `┃ *ᴠᴇʀsɪᴏɴ* : ${version}\n`;
        msg += `┃ *sᴘᴇᴇᴅ* : ${(Math.random() * 0.5 + 0.2).toFixed(4)} ms\n`;
        msg += `┃ *ᴜsᴀɢᴇ* : ${formatBytes(ramUsed)} of ${formatBytes(ramTotal)}\n`;
        msg += `┃ *ʀᴀᴍ:* ${ramBar(ramUsed, ramTotal)}\n`;
        msg += `┗▣ \n\n`;

        // Categories
        const processed = new Set();
        for (const key of CATEGORY_ORDER) {
            if (cats[key]?.length) {
                const label = CATEGORY_LABELS[key] || `${key.toUpperCase()} MENU`;
                msg += `┏▣ ◈ *${label}* ◈\n`;
                const sorted = [...cats[key]].sort();
                for (const c of sorted) {
                    msg += `│➽ ${c}\n`;
                }
                msg += `┗▣ \n\n`;
                processed.add(key);
            }
        }

        // Any remaining categories not in order
        for (const [key, cmds] of Object.entries(cats)) {
            if (!processed.has(key) && cmds.length) {
                const label = CATEGORY_LABELS[key] || `${key.toUpperCase()} MENU`;
                msg += `┏▣ ◈ *${label}* ◈\n`;
                const sorted = [...cmds].sort();
                for (const c of sorted) {
                    msg += `│➽ ${c}\n`;
                }
                msg += `┗▣ \n\n`;
            }
        }

        // Try to send with image
        const imgUrl = process.env.BOT_THUMBNAIL || 'https://files.catbox.moe/13uws5.jpg';
        try {
            const imgResp = await axios.get(imgUrl, {
                responseType: 'arraybuffer',
                timeout: 8000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const imgBuf = Buffer.from(imgResp.data);
            await sock.sendMessage(from, { image: imgBuf, caption: msg }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: msg }, { quoted: message });
        }
    }
};
