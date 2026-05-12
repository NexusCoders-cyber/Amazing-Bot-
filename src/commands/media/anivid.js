import axios from 'axios';

const API_URL = 'https://arychauhann.onrender.com/api/animevideo';

function normalizeAnimeItems(payload) {
    const rows = [];
    const data = payload?.data || payload?.result || payload;

    if (Array.isArray(data)) {
        data.forEach((it) => rows.push(it));
    } else if (data && typeof data === 'object') {
        if (data.playUrl || data.video || data.url) rows.push(data);
        else Object.keys(data).forEach((k) => { if (/^\d+$/.test(k) && data[k]) rows.push(data[k]); });
    }

    return rows.filter(Boolean).map((it, i) => ({
        index: i + 1,
        title: it.title || it.author || `Anime Video ${i + 1}`,
        url: it.playUrl || it.video || it.url || it.video_1 || it.video_2,
        cover: it.cover || null,
        author: it.user?.nickname || it.author || 'Unknown'
    })).filter((x) => x.url);
}

async function fetchWithRetry() {
    let lastErr;
    for (let i = 0; i < 3; i += 1) {
        try {
            const { data } = await axios.get(API_URL, { timeout: 120000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            const items = normalizeAnimeItems(data);
            if (items.length) return items;
        } catch (e) {
            lastErr = e;
        }
    }
    if (lastErr) throw lastErr;
    return [];
}

export default {
    name: 'anivid',
    aliases: ['anime', 'randomvid'],
    category: 'media',
    description: 'Fetch anime videos and choose by number',
    usage: 'anivid',
    cooldown: 10,

    async execute({ sock, message, from }) {
        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });
            const items = (await fetchWithRetry()).slice(0, 10);
            if (!items.length) throw new Error('No video items returned');

            const text = [
                '🎬 *Anime Video List*',
                '',
                ...items.map((v) => `${v.index}. ${v.title}`),
                '',
                'Reply with a number to get the video in chat.'
            ].join('\n');

            const sent = await sock.sendMessage(from, { text }, { quoted: message });
            if (!global.replyHandlers) global.replyHandlers = {};

            global.replyHandlers[sent.key.id] = {
                command: 'anivid',
                handler: async (replyText, replyMessage) => {
                    const n = Number.parseInt(String(replyText || '').trim(), 10);
                    if (!n || n < 1 || n > items.length) {
                        return sock.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: replyMessage });
                    }
                    const pick = items[n - 1];
                    return sock.sendMessage(from, {
                        video: { url: pick.url },
                        mimetype: 'video/mp4',
                        caption: `🎬 ${pick.title}\n👤 ${pick.author}`
                    }, { quoted: replyMessage });
                }
            };

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (err) {
            await sock.sendMessage(from, { text: `❌ Failed to fetch anime videos: ${err.message}` }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};
