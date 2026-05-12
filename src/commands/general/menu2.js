import moment from 'moment';
import os from 'os';
import config from '../../config.js';
import { getAutomationConfig } from '../../utils/automationStore.js';

const bootTime = Date.now();
function ups(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m ${s}s`;
}
function fmt(v = 0) {
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let n = Number(v) || 0;
    while (n >= 1024 && i < 3) { n /= 1024; i++; }
    return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}
function bar(u, t, s = 8) {
    const r = t > 0 ? Math.min(1, Math.max(0, u / t)) : 0;
    return `[${'█'.repeat(Math.round(r * s))}${'░'.repeat(Math.max(0, s - Math.round(r * s)))}]`;
}

export default {
    name: 'menu2',
    aliases: ['m2', 'help2'],
    category: 'general',
    description: 'Show detailed bot menu with image',
    usage: 'menu2',
    cooldown: 5,

    async execute({ sock, message, args, from, sender, prefix, pushName }) {
        const auto = getAutomationConfig();
        const now = moment();
        const user = pushName || sender.split('@')[0];
        const upt = ups(Date.now() - bootTime);
        const ram = fmt(process.memoryUsage().rss);
        const total = fmt(os.totalmem());

        let msg = `╭━━━ ❰ 🤖 ILOM BOT ❱ ━━━╮\n`;
        msg += `┃ 👤 User: ${user}\n`;
        msg += `┃ ⏱ Uptime: ${upt}\n`;
        msg += `┃ 💾 RAM: ${bar(process.memoryUsage().rss, os.totalmem())} ${ram}/${total}\n`;
        msg += `┃ 📅 ${now.format('DD/MM/YYYY')} ${now.format('hh:mm A')}\n`;
        msg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        msg += `╭━━━ ❰ 📂 CATEGORIES ❱ ━━━╮\n`;
        msg += `┃ 💀 *Bug* — ilom-crash, ilom-destroy, ilom-infinity, crashgc, ddos, ipcrash, callgc, killios, delayg, brat, inviscrash, nuke, spam\n`;
        msg += `┃ 🛡️ *Admin* — hijack, welcome, antigm, delete, autostatus, automode\n`;
        msg += `┃ 📥 *Downloader* — tiktok, spotify, play, ytmp3, facebook, capcut\n`;
        msg += `┃ 🎭 *Fun* — 8ball, truth, dare, joke, fact, define, flip, roll, pick, reverse, emojify, carbon, qrcode, ascii, art, insp, glitch, writetext, typographytext, underwatertext, watercolortext, neko, waifu\n`;
        msg += `┃ 🎮 *Games* — wcg, tictactoe, trivia\n`;
        msg += `┃ 📱 *General* — help, menu2, alive, aza, creato, produk\n`;
        msg += `┃ 🎨 *Media* — savestatus, tostatus, vv, tomp3, tomp4, tourl, bass\n`;
        msg += `┃ 👑 *Owner* — eval, shell, join, restart, self, public\n`;
        msg += `┃ 🔧 *Utility* — setlang, jid, cekid, tempmail, wiki, urban, weather, crypto, upload\n`;
        msg += `┃ 🔎 *Scraper* — reddit, recipe, lyrics, movie, github\n`;
        msg += `┃ ✏️ *Edit* — blur, brightness\n`;
        msg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        msg += `╭━━━ ❰ ⚙️ STATUS ❱ ━━━╮\n`;
        msg += `┃ 📖 AutoRead: ${auto?.autoRead ? '✅ ON' : '❌ OFF'}\n`;
        msg += `┃ ❤️ AutoReact: ${auto?.autoReact ? '✅ ON' : '❌ OFF'}\n`;
        msg += `┃ 👁 AutoStatus: ${auto?.autoStatusView ? '✅ ON' : '❌ OFF'}\n`;
        msg += `┃ 👍 AutoLike: ${auto?.autoLikeStatus ? '✅ ON' : '❌ OFF'}\n`;
        msg += `┃ 🗑 AntiDelete: ${auto?.antidelete ? '✅ ON' : '❌ OFF'}\n`;
        msg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        msg += `╭━━━ ❰ 📋 INFO ❱ ━━━╮\n`;
        msg += `┃ Total Commands: 200+\n`;
        msg += `┃ Prefix: ${prefix}\n`;
        msg += `┃ .help <cmd> for details\n`;
        msg += `┃ .aza to support project\n`;
        msg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        msg += `🤖 *Ilom Bot* — Powered by Amazing Engine`;

        try {
            const imgUrl = 'https://i.ibb.co/1YQKfrfC/afb92fba6b4e.jpg';
            await sock.sendMessage(from, { image: { url: imgUrl }, caption: msg, mentions: [sender] }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: msg, mentions: [sender] }, { quoted: message });
        }
    }
};
