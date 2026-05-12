import axios from 'axios';

const SEARCH_API = 'https://omegatech-api.dixonomega.tech/api/Search/bili';
const DL_API = 'https://omegatech-api.dixonomega.tech/api/download/bilidl';
function delay(ms = 1200) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export default {
    name: 'bl',
    aliases: ['bili', 'bilibili'],
    category: 'downloader',
    description: 'Search and download Bilibili videos',
    usage: 'bl <query>',
    minArgs: 1,
    cooldown: 8,

    async execute({ sock, message, from, args }) {
        const query = args.join(' ').trim();
        const { data } = await axios.get(SEARCH_API, { params: { q: query }, timeout: 60000 });
        const items = (data?.results || []).slice(0, 10);
        if (!items.length) return sock.sendMessage(from, { text: '❌ No result found.' }, { quoted: message });

        const text = ['🎬 Bilibili Search', '', ...items.map((v, i) => `${i + 1}. ${v.title}\n⏱ ${v.duration} • 👤 ${v.uploader}`), '', 'Reply with number to download (example: 2 360p)'].join('\n');
        const sent = await sock.sendMessage(from, { text }, { quoted: message });

        if (!global.replyHandlers) global.replyHandlers = {};
        global.replyHandlers[sent.key.id] = {
            command: 'bl',
            handler: async (replyText, replyMessage) => {
                const raw = String(replyText || '').trim().toLowerCase();
                const [idx, wantedQ] = raw.split(/\s+/);
                const n = Number.parseInt(idx, 10);
                if (!n || n < 1 || n > items.length) return sock.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: replyMessage });
                const pick = items[n - 1];
                await sock.sendMessage(from, { text: '⏳ Preparing download...' }, { quoted: replyMessage });
                await delay(1400);
                const dl = await axios.get(DL_API, { params: { url: pick.videoUrl }, timeout: 120000 });
                const payload = dl?.data || {};
                const mediaList = Array.isArray(payload?.media) ? payload.media.filter((m) => m?.url) : [];
                const selected = wantedQ ? mediaList.find((m) => String(m.quality || '').toLowerCase() === wantedQ) : null;
                const videoOnly = mediaList.filter((m) => !String(m.quality || '').toLowerCase().includes('audio'));
                const best = selected || videoOnly[0] || mediaList[0];
                const finalUrl = best?.url || payload?.direct || mediaList[0]?.url;
                if (!finalUrl) return sock.sendMessage(from, { text: '❌ Download link not available.' }, { quoted: replyMessage });
                const fileName = `${(payload.title || pick.title || 'bilibili').replace(/[\\/:*?"<>|]/g, '').slice(0, 80)}_${best?.quality || 'auto'}.mp4`;
                    try {
                        await sock.sendMessage(from, {
                            video: { url: finalUrl },
                            mimetype: 'video/mp4',
                            fileName,
                            caption: `🎬 ${payload.title || pick.title}\n🎞 Quality: ${best?.quality || 'auto'}`
                        }, { quoted: replyMessage });
                    } catch {
                        await sock.sendMessage(from, {
                            video: { url: pick.videoUrl },
                            mimetype: 'video/mp4',
                            fileName
                        }, { quoted: replyMessage });
                    }
                delete global.replyHandlers?.[sent.key.id];
                return null;
            }
        };
    }
};
