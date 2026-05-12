import axios from 'axios';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const ASSEMBLY_API_KEY = '22b87c4a57e04c73914de4b75edd05c1';

async function uploadAudio(buffer) {
    const up = await axios.post('https://api.assemblyai.com/v2/upload', buffer, {
        headers: { authorization: ASSEMBLY_API_KEY, 'content-type': 'application/octet-stream' },
        timeout: 120000,
        maxBodyLength: Infinity
    });
    return up.data.upload_url;
}

async function transcribeUrl(audioUrl) {
    const create = await axios.post('https://api.assemblyai.com/v2/transcript', {
        audio_url: audioUrl,
        language_detection: true
    }, { headers: { authorization: ASSEMBLY_API_KEY }, timeout: 60000 });

    const id = create.data.id;
    for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const check = await axios.get(`https://api.assemblyai.com/v2/transcript/${id}`, {
            headers: { authorization: ASSEMBLY_API_KEY }, timeout: 60000
        });
        const status = check.data.status;
        if (status === 'completed') return check.data.text || '';
        if (status === 'error') throw new Error(check.data.error || 'Transcription failed');
    }
    throw new Error('Timed out waiting for transcription');
}

export default {
    name: 'transcribe',
    aliases: ['stt', 'vtt'],
    category: 'ai',
    description: 'Transcribe a replied voice note/audio message to text',
    usage: 'transcribe (reply to voice note)',
    cooldown: 6,

    async execute({ sock, message, from }) {
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const ownAudio = message.message?.audioMessage;
            const target = quoted?.audioMessage ? { message: quoted } : ownAudio ? message : null;

            if (!target) {
                return await sock.sendMessage(from, { text: '❌ Reply to a voice note/audio message.' }, { quoted: message });
            }

            await sock.sendMessage(from, { text: '⏳ Transcribing audio...' }, { quoted: message });
            const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
            const audioUrl = await uploadAudio(buffer);
            const text = await transcribeUrl(audioUrl);

            await sock.sendMessage(from, { text: text ? `📝 *Transcription*\n\n${text}` : '❌ No speech detected.' }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Transcribe failed: ${error.message}` }, { quoted: message });
        }
    }
};
