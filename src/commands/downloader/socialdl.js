import axios from 'axios';
import { fetchAllInOneDownload, parseAllInOneMeta, pickBestMedia } from '../../utils/allInOneDownloader.js';

const MALVRYX_KEY = 'mlvx_free_9d0115d2137e2709c61fe5850f562086a0547e2b49c00f903fcec632564cb9ca';
const MALVRYX_BASE = 'https://apis.malvryx.dev/api/downloader';

function detectCommand(message, fallback = 'fbdl') {
    const text = message?.message?.conversation || message?.message?.extendedTextMessage?.text || '';
    const token = text.trim().split(/\s+/)[0].replace(/^[^a-zA-Z]+/, '').toLowerCase();
    return token || fallback;
}

async function fetchViaMalvryx(url) {
    const headers = { 'X-API-Key': MALVRYX_KEY, 'Content-Type': 'application/json' };

    let taskId = '';
    try {
        const start = await axios.get(`${MALVRYX_BASE}/aiovdl1`, { params: { url }, headers, timeout: 20000 });
        taskId = start?.data?.taskId || start?.data?.result?.taskId || '';
        if (start?.data?.result?.download) return start.data;
    } catch {}

    const status = await axios.get(`${MALVRYX_BASE}/aiovdl1-task`, {
        params: { taskId, url },
        headers,
        timeout: 30000
    });

    return status.data;
}

async function fetchViaPrexzy(url) {
    const { data } = await axios.get('https://apis.prexzyvilla.site/download/aio', {
        params: { url },
        timeout: 40000
    });
    return data;
}

export default {
    name: 'fbdl',
    aliases: ['fb', 'fbdownload', 'igdl', 'tkdl', 'ttdl', 'tiktokdl', 'instagramdl'],
    category: 'downloader',
    description: 'Download social media content (FB/IG/TikTok)',
    usage: 'fbdl <url> | igdl <url> | tkdl <url>',
    cooldown: 8,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const url = args[0]?.trim();
            if (!/^https?:\/\//i.test(url || '')) {
                return await sock.sendMessage(from, { text: '❌ Send a valid URL.' }, { quoted: message });
            }

            let payload;
            try {
                payload = await fetchViaMalvryx(url);
            } catch {
                try {
                    payload = await fetchAllInOneDownload(url);
                } catch {
                    payload = await fetchViaPrexzy(url);
                }
            }

            const media = pickBestMedia(payload, 'video') || pickBestMedia(payload, 'audio');
            if (!media) throw new Error('No downloadable media found');

            const meta = parseAllInOneMeta(payload);
            const cmd = detectCommand(message);
            const label = cmd.includes('ig') ? 'Instagram' : cmd.includes('tk') || cmd.includes('tt') ? 'TikTok' : 'Facebook';

            if (/\.mp3($|\?)/i.test(media)) {
                await sock.sendMessage(from, {
                    audio: { url: media },
                    mimetype: 'audio/mpeg',
                    fileName: `${meta.title}.mp3`,
                    ptt: false
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, {
                    video: { url: media },
                    mimetype: 'video/mp4',
                    caption: `✅ *${label} Download*\n\n🎬 ${meta.title}\n👤 ${meta.artist}`
                }, { quoted: message });
            }
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Download failed: ${error.message}` }, { quoted: message });
        }
    }
};
