import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function getQuotedText(message) {
    const q = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!q) return '';
    return q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || '';
}

const VOICES = {
    woman1: { voice: 'woman1', language: 'English' },
    woman2: { voice: 'woman2', language: 'English' },
    woman3: { voice: 'woman3', language: 'English' },
    man1: { voice: 'man1', language: 'English' },
    man2: { voice: 'man2', language: 'English' },
    man3: { voice: 'man3', language: 'English' }
};

async function fetchAudio(text, voice) {
    const mapped = VOICES[voice] || VOICES.woman1;
    try {
        const { data } = await axios.get('https://omegatech-api.dixonomega.tech/api/ai/text2speech-v3', {
            params: { text, voice: mapped.voice, language: mapped.language },
            timeout: 90000
        });
        const audioUrl = data?.audio;
        if (!audioUrl) throw new Error('No audio URL returned');
        const res = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 90000 });
        return Buffer.from(res.data);
    } catch {
        const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text.slice(0, 500))}`;
        const g = await axios.get(gUrl, {
            responseType: 'arraybuffer',
            timeout: 90000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return Buffer.from(g.data);
    }
}

export default {
    name: 'tts',
    aliases: ['t2s'],
    category: 'ai',
    description: 'Text to speech (voice note)',
    usage: 'tts [voice] <text> or reply to a message with tts',
    cooldown: 5,

    async execute({ sock, message, from, args }) {
        let voice = 'woman1';
        let input = args.join(' ').trim();

        const first = (args[0] || '').toLowerCase();
        if (VOICES[first]) {
            voice = first;
            input = args.slice(1).join(' ').trim();
        }

        const quotedText = getQuotedText(message);
        const text = input || quotedText;

        if (!text) {
            return sock.sendMessage(from, {
                text: `Give text or reply to a message.\nVoices: ${Object.keys(VOICES).join(', ')}`
            }, { quoted: message });
        }

        try {
            const buffer = await fetchAudio(text.slice(0, 900), voice);

            // Convert MP3 to OGG Opus for WhatsApp voice note compatibility
            const tmp = path.join('/tmp', `tts_vn_${Date.now()}_${Math.random().toString(16).slice(2)}`);
            const inFile = `${tmp}.mp3`;
            const outFile = `${tmp}.ogg`;
            await fs.writeFile(inFile, buffer);

            try {
                await execFileAsync('ffmpeg', ['-y', '-i', inFile, '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '48k', outFile]);
                const ogg = await fs.readFile(outFile);
                if (ogg?.length > 512) {
                    await sock.sendMessage(from, { audio: ogg, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: message });
                    await fs.remove(inFile).catch(() => {});
                    await fs.remove(outFile).catch(() => {});
                    return null;
                }
            } catch {}

            // Fallback: send as mp3 with ptt=false
            await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg', ptt: false, caption: '⚠️ Could not convert — sent as audio' }, { quoted: message });
            await fs.remove(inFile).catch(() => {});
            await fs.remove(outFile).catch(() => {});
        } catch (error) {
            await sock.sendMessage(from, { text: `TTS Error\n${error.message}` }, { quoted: message });
        }

        return null;
    }
};
