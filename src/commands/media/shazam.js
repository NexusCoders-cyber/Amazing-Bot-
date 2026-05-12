import axios from 'axios';
import FormData from 'form-data';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const AUDD_TOKEN = '45a9639dc5f736027983b959b0776287';

function getTargetMessage(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const own = message?.message;

    if (quoted?.audioMessage || quoted?.videoMessage || quoted?.documentMessage) {
        return { message: quoted };
    }
    if (own?.audioMessage || own?.videoMessage || own?.documentMessage) {
        return message;
    }
    return null;
}

function extractResultText(result = {}) {
    const track = result?.result;
    if (!track) return '❌ No song match found.';

    const title = track.title || 'Unknown title';
    const artist = track.artist || 'Unknown artist';
    const album = track.album || 'Unknown album';
    const release = track.release_date || 'Unknown';
    const apple = track.apple_music?.url || 'N/A';
    const spotify = track.spotify?.external_urls?.spotify || 'N/A';

    return [
        '🎵 *Shazam Result*',
        `• *Title:* ${title}`,
        `• *Artist:* ${artist}`,
        `• *Album:* ${album}`,
        `• *Release:* ${release}`,
        '',
        `🍎 Apple Music: ${apple}`,
        `🟢 Spotify: ${spotify}`
    ].join('\n');
}

export default {
    name: 'shazam',
    aliases: ['findsong', 'songid'],
    category: 'media',
    description: 'Identify a song from replied voice note/audio/video',
    usage: 'shazam (reply to song/vn/video)',
    cooldown: 6,

    async execute({ sock, message, from }) {
        try {
            const target = getTargetMessage(message);
            if (!target) {
                await sock.sendMessage(from, {
                    text: '❌ Reply to an audio, voice note, or video that contains music.'
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, { text: '🔎 Listening... identifying song now.' }, { quoted: message });

            const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
            const form = new FormData();
            form.append('api_token', AUDD_TOKEN);
            form.append('return', 'apple_music,spotify');
            form.append('file', buffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });

            const { data } = await axios.post('https://api.audd.io/', form, {
                headers: form.getHeaders(),
                timeout: 120000,
                maxBodyLength: Infinity
            });

            await sock.sendMessage(from, { text: extractResultText(data) }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Shazam failed: ${error.message}`
            }, { quoted: message });
        }
    }
};
