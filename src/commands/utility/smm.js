import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'smm_config.json');

async function loadConfig() {
    try { return await fs.readJSON(CONFIG_FILE); } catch { return {}; }
}
async function saveConfig(d) {
    await fs.ensureDir(path.dirname(CONFIG_FILE));
    await fs.writeJSON(CONFIG_FILE, d, { spaces: 2 });
}

const DEFAULT_API = 'https://smmstone.com/api/v2';

async function callAPI(action, params = {}) {
    const cfg = await loadConfig();
    const apiUrl = cfg.apiUrl || DEFAULT_API;
    const apiKey = cfg.apiKey || process.env.SMM_API_KEY || '';
    if (!apiKey) throw new Error('No SMM API key. Set with: .smm setkey <your_key>');
    const { data } = await axios.post(apiUrl, { key: apiKey, action, ...params }, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return data;
}

export default {
    name: 'smm',
    aliases: ['social', 'boost', 'followers', 'smmpanel'],
    category: 'utility',
    description: 'Social media booster — followers, likes, shares, comments',
    usage: 'smm <action> [args]',
    cooldown: 5,
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args, prefix }) {
        const sub = args[0]?.toLowerCase();

        if (sub === 'setkey') {
            const key = args.slice(1).join(' ').trim();
            if (!key) return await sock.sendMessage(from, { text: '❌ Usage: .smm setkey <api_key>' }, { quoted: message });
            const cfg = await loadConfig();
            cfg.apiKey = key;
            await saveConfig(cfg);
            return await sock.sendMessage(from, { text: '✅ SMM API key saved.' }, { quoted: message });
        }

        if (sub === 'setapi') {
            const url = args.slice(1).join(' ').trim();
            if (!url) return await sock.sendMessage(from, { text: '❌ Usage: .smm setapi <url>' }, { quoted: message });
            const cfg = await loadConfig();
            cfg.apiUrl = url;
            await saveConfig(cfg);
            return await sock.sendMessage(from, { text: `✅ API URL set to: ${url}` }, { quoted: message });
        }

        if (sub === 'balance' || sub === 'bal') {
            try {
                const data = await callAPI('balance');
                const bal = data?.balance || data?.data?.balance || 'N/A';
                const currency = data?.currency || 'USD';
                return await sock.sendMessage(from, { text: `💰 *Balance:* ${bal} ${currency}` }, { quoted: message });
            } catch (e) {
                return await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: message });
            }
        }

        if (sub === 'services' || sub === 'list') {
            try {
                const data = await callAPI('services');
                const services = data?.data || data?.result || [];
                if (!services.length) {
                    let text = '📋 *Available Services*\n\nReply with:\n';
                    const platforms = { tiktok: ['followers', 'likes', 'views', 'shares'], instagram: ['followers', 'likes', 'comments', 'views'], youtube: ['subscribers', 'views', 'likes', 'comments'], facebook: ['followers', 'likes', 'shares'], telegram: ['members', 'views'] };
                    for (const [p, types] of Object.entries(platforms)) {
                        text += `\n*${p.toUpperCase()}*\n`;
                        for (const t of types) text += `  • ${prefix}smm order ${p} ${t} <link> <qty>\n`;
                    }
                    text += `\nOr: ${prefix}smm balance`;
                    return await sock.sendMessage(from, { text }, { quoted: message });
                }
                let text = '📋 *SMM Services*\n\n';
                services.slice(0, 40).forEach((s, i) => {
                    text += `${i + 1}. ${s.name || s.service || 'Service'} — 💰${s.price || s.rate || '?'}\n`;
                });
                return await sock.sendMessage(from, { text }, { quoted: message });
            } catch (e) {
                return await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: message });
            }
        }

        if (sub === 'order') {
            const platform = args[1]?.toLowerCase();
            const type = args[2]?.toLowerCase();
            const link = args[3];
            const quantity = parseInt(args[4], 10);
            if (!platform || !type || !link || !quantity) {
                return await sock.sendMessage(from, { text: `❌ Usage: ${prefix}smm order <platform> <type> <link> <qty>\nExample: ${prefix}smm order tiktok followers https://tiktok.com/@user 1000` }, { quoted: message });
            }
            if (quantity < 10 || quantity > 50000) return await sock.sendMessage(from, { text: '❌ Quantity: 10-50000.' }, { quoted: message });

            try {
                await sock.sendMessage(from, { text: `⏳ Ordering ${quantity} ${type} for ${platform}...` }, { quoted: message });
                const data = await callAPI('add', { service: platform + '_' + type, link, quantity });
                const orderId = data?.order || data?.orderId || data?.id || 'N/A';
                return await sock.sendMessage(from, { text: `✅ *Order Placed!*\n\n🆔 ${orderId}\n📱 ${platform}\n📋 ${type}\n📊 ${quantity}\n\n⏱ Starts in 5-30 min.` }, { quoted: message });
            } catch (e) {
                try {
                    const data = await callAPI('order', { service: platform + '_' + type, link, quantity });
                    const orderId = data?.order || data?.orderId || data?.id || 'N/A';
                    return await sock.sendMessage(from, { text: `✅ *Order Placed!*\n\n🆔 ${orderId}\n📱 ${platform}\n📋 ${type}\n📊 ${quantity}` }, { quoted: message });
                } catch (e2) {
                    return await sock.sendMessage(from, { text: `❌ ${e2.message}` }, { quoted: message });
                }
            }
        }

        if (sub === 'status') {
            const orderId = args[1];
            if (!orderId) return await sock.sendMessage(from, { text: `❌ Usage: ${prefix}smm status <id>` }, { quoted: message });
            try {
                const data = await callAPI('status', { order: orderId });
                return await sock.sendMessage(from, { text: `📊 *Order ${orderId}*\nStatus: ${data?.status || data?.data?.status || 'Unknown'}\nDone: ${data?.start_count || 0}\nRemaining: ${data?.remains || 0}` }, { quoted: message });
            } catch (e) {
                return await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: message });
            }
        }

        let text = '📱 *SMM Panel — Social Media Booster*\n\n';
        text += `${prefix}smm balance — check balance\n`;
        text += `${prefix}smm services — list services\n`;
        text += `${prefix}smm order <platform> <type> <link> <qty> — order\n`;
        text += `${prefix}smm status <id> — check order\n`;
        text += `${prefix}smm setkey <key> — set API key\n`;
        text += `${prefix}smm setapi <url> — set custom API\n\n`;
        text += `*Platforms:* tiktok, instagram, youtube, facebook, telegram\n`;
        text += `*Types:* followers, likes, views, shares, comments, subscribers\n\n`;
        text += `*Example:*\n${prefix}smm order tiktok followers https://tiktok.com/@user 1000\n\n`;
        text += `⚠️ Need an SMM API key. Get one from smmstone.com or similar.`;

        await sock.sendMessage(from, { text }, { quoted: message });
    }
};
