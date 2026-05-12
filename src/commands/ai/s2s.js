import axios from 'axios';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const ASSEMBLY_API_KEY = process.env.ASSEMBLY_API_KEY || '22b87c4a57e04c73914de4b75edd05c1';
const TTS_VOICE = process.env.S2S_VOICE || 'Joanna';

function getQuotedMedia(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return null;
    if (quoted.audioMessage) return { message: { audioMessage: quoted.audioMessage } };
    if (quoted.videoMessage) return { message: { videoMessage: quoted.videoMessage } };
    return null;
}

async function transcribeAudio(buffer) {
    if (!ASSEMBLY_API_KEY) throw new Error('Missing ASSEMBLY_API_KEY');

    const upload = await axios.post('https://api.assemblyai.com/v2/upload', buffer, {
        headers: {
            authorization: ASSEMBLY_API_KEY,
            'content-type': 'application/octet-stream'
        },
        timeout: 120000,
        maxBodyLength: Infinity
    });

    const audioUrl = upload?.data?.upload_url;
    if (!audioUrl) throw new Error('Failed to upload audio.');

    const created = await axios.post('https://api.assemblyai.com/v2/transcript', {
        audio_url: audioUrl,
        language_detection: true
    }, {
        headers: { authorization: ASSEMBLY_API_KEY },
        timeout: 60000
    });

    const id = created?.data?.id;
    if (!id) throw new Error('Failed to start transcription.');

    for (let i = 0; i < 24; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const status = await axios.get(`https://api.assemblyai.com/v2/transcript/${id}`, {
            headers: { authorization: ASSEMBLY_API_KEY },
            timeout: 60000
        });

        if (status?.data?.status === 'completed') {
            return String(status?.data?.text || '').trim();
        }
        if (status?.data?.status === 'error') {
            throw new Error(status?.data?.error || 'Transcription failed.');
        }
    }

    throw new Error('Transcription timed out.');
}

async function synthesizeVoice(text) {
    const cleaned = String(text || '').trim().slice(0, 800);
    if (!cleaned) throw new Error('No speech detected in the media.');

    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(TTS_VOICE)}&text=${encodeURIComponent(cleaned)}`;
    const audio = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    return Buffer.from(audio.data);
}

export default {
    name: 's2s',
    aliases: ['speech2speech', 'voicetovoice', 'sts'],
    category: 'ai',
    description: 'Speech-to-speech: reply to voice/video and get a generated voice note response',
    usage: 's2s (reply to voice/audio/video)',
    cooldown: 5,
    args: false,

    async execute({ sock, message, from }) {
        try {
            const target = getQuotedMedia(message)
                || (message?.message?.audioMessage ? message : null)
                || (message?.message?.videoMessage ? message : null);

            if (!target) {
                return await sock.sendMessage(from, {
                    text: '❌ Reply to a voice/audio/video message with s2s.'
                }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '🎙️', key: message.key } });
            const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
            const transcript = await transcribeAudio(buffer);
            const voice = await synthesizeVoice(transcript);

            await sock.sendMessage(from, {
                audio: voice,
                mimetype: 'audio/mpeg',
                ptt: true
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ s2s failed: ${error.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};
