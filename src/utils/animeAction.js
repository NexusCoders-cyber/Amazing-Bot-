import axios from 'axios';

const WAIFU_ENDPOINTS = new Set([
    'slap', 'kick', 'punch', 'kill', 'bite', 'poke', 'pat', 'hug', 'cuddle',
    'kiss', 'lick', 'bully', 'bonk', 'yeet', 'wave', 'handhold', 'highfive',
    'smile', 'blush', 'happy', 'wink', 'cry', 'dance', 'cringe'
]);

const ACTION_ALIASES = {
    hold: 'handhold',
    hi: 'wave',
    animehug: 'hug',
    animekiss: 'kiss'
};

function normalizeAction(action = '') {
    const clean = String(action || '').toLowerCase().trim();
    return ACTION_ALIASES[clean] || clean;
}

async function getWaifuPic(type) {
    const { data } = await axios.get(`https://api.waifu.pics/sfw/${type}`, { timeout: 25000 });
    return data?.url || '';
}

export async function runAnimeAction({ sock, message, from, action }) {
    const normalized = normalizeAction(action);
    await sock.sendMessage(from, { text: '⏳ Please wait...' }, { quoted: message });

    let mediaUrl = '';

    if (WAIFU_ENDPOINTS.has(normalized)) {
        mediaUrl = await getWaifuPic(normalized);
    }

    if (!mediaUrl) {
        const { data } = await axios.get(`https://apis.prexzyvilla.site/anime/${normalized}`, { timeout: 25000 });
        const payload = data?.result || data?.data || data;
        mediaUrl = payload?.url || payload?.gif || payload?.video || payload?.image || '';
    }

    if (!mediaUrl) throw new Error('No media URL returned');

    const senderName = message?.pushName || 'Someone';
    const caption = `${senderName} used ${normalized}!`;
    const isVideoLike = /\.(mp4|webm|mov|mkv|gif)(\?|$)/i.test(mediaUrl);

    if (isVideoLike) {
        await sock.sendMessage(from, {
            video: { url: mediaUrl },
            gifPlayback: true,
            caption
        }, { quoted: message });
        return;
    }

    await sock.sendMessage(from, { image: { url: mediaUrl }, caption }, { quoted: message });
}
