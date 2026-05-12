import axios from 'axios';

const API_URL = 'https://arychauhann.onrender.com/api/hentai';

function normalizeItems(payload) {
    const raw = payload?.results || payload?.result || payload?.data || payload;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
        return Object.keys(raw)
            .filter((k) => /^\d+$/.test(k))
            .map((k) => raw[k])
            .filter(Boolean);
    }
    return [];
}

export default {
    name: 'hentai',
    aliases: ['hen', 'sfmhentai'],
    category: 'fun',
    description: 'Get random hentai picks and choose one to receive videos',
    usage: 'hentai',
    cooldown: 8,

    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get(API_URL, { timeout: 120000 });
            const items = normalizeItems(data).slice(0, 10);
            if (!items.length) return await sock.sendMessage(from, { text: '❌ No hentai results available.' }, { quoted: message });

            const text = ['🔞 Hentai Picks', '', ...items.map((item, i) => `${i + 1}. ${item?.title || item?.name || `Video ${i + 1}`}`), '', 'Reply with number to download'].join('\n');
            const sent = await sock.sendMessage(from, { text }, { quoted: message });

            if (!global.replyHandlers) global.replyHandlers = {};
            global.replyHandlers[sent.key.id] = {
                command: 'hentai',
                handler: async (replyText, replyMessage) => {
                    const n = Number.parseInt(String(replyText || '').trim(), 10);
                    if (!n || n < 1 || n > items.length) {
                        return await sock.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: replyMessage });
                    }
                    const picked = items[n - 1];
                    const videos = [
                        picked?.video,
                        picked?.video2,
                        picked?.video_1,
                        picked?.video_2,
                        picked?.url,
                        ...(Array.isArray(picked?.videos) ? picked.videos : [])
                    ].filter(Boolean);
                    if (!videos.length) return await sock.sendMessage(from, { text: '❌ Video URL not found in selected item.' }, { quoted: replyMessage });
                    await sock.sendMessage(from, {
                        video: { url: videos[0] },
                        mimetype: 'video/mp4',
                        caption: `🔞 ${picked?.title || picked?.name || 'Selected video'}`
                    }, { quoted: replyMessage });
                    return null;
                }
            };
        } catch (error) {
            return await sock.sendMessage(from, { text: `❌ hentai failed: ${error.message}` }, { quoted: message });
        }
    }
};
