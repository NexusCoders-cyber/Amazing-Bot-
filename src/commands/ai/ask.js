import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const DATA_DIR = path.join(process.cwd(), 'data', 'ai');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const MAX_HISTORY = 10;

// Load/save
let settings = {};
let history = {};
try { settings = fs.readJSONSync(SETTINGS_FILE); } catch {}
try { history = fs.readJSONSync(HISTORY_FILE); } catch {}
function saveSettings() { fs.ensureDirSync(DATA_DIR); fs.writeJSONSync(SETTINGS_FILE, settings, { spaces: 2 }); }
function saveHistory() { fs.ensureDirSync(DATA_DIR); fs.writeJSONSync(HISTORY_FILE, history, { spaces: 2 }); }

// Transcribe audio
async function transcribeAudio(sock, message) {
    try {
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        const audioMsg = quoted?.audioMessage || quoted?.pttMessage;
        if (!audioMsg) return null;
        const stream = await downloadContentFromMessage(audioMsg, 'audio');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        const b64 = buffer.toString('base64');
        const { data } = await axios.post('https://api.davidcyril.name.ng/transcribe', { audio: b64 }, { timeout: 30000 });
        return data?.text || data?.transcript || data?.message || null;
    } catch { return null; }
}

// TTS
async function tts(text, lang = 'en') {
    try {
        const { data } = await axios.get(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text.slice(0, 200))}`, { responseType: 'arraybuffer', timeout: 15000 });
        return Buffer.from(data);
    } catch { return null; }
}

// Providers
async function askGemini(text) {
    const key = process.env.GEMINI_API_KEY || '';
    if (!key) throw new Error('GEMINI_API_KEY not set');
    const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        contents: [{ parts: [{ text }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 2000 }
    }, { timeout: 60000 });
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response';
}

async function askGroq(text) {
    const key = process.env.GROQ_API_KEY || '';
    if (!key) throw new Error('GROQ_API_KEY not set');
    const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: text }],
        temperature: 0.5, max_tokens: 2000
    }, { timeout: 60000, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } });
    return data?.choices?.[0]?.message?.content?.trim() || 'No response';
}

async function askQwen(text) {
    const key = process.env.QWEN_API_KEY || process.env.QWEN_ACCESS_TOKEN || '';
    if (!key) throw new Error('QWEN_API_KEY not set');
    const base = process.env.QWEN_BASE_URL || 'https://qwen.aikit.club/v1';
    const { data } = await axios.post(`${base}/chat/completions`, {
        model: 'Qwen3.5-Plus',
        messages: [{ role: 'user', content: text }],
        temperature: 0.5, max_tokens: 2000
    }, { timeout: 60000, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } });
    return data?.choices?.[0]?.message?.content?.trim() || 'No response';
}

export default {
    name: 'ask',
    aliases: ['ai', 'chat', 'gemini', 'groq', 'qwen'],
    category: 'ai',
    description: 'Chat with AI (gemini/groq/qwen). Reply to voice note to transcribe.',
    usage: '.ask <text> | .ask gemini|groq|qwen <text> | reply to VN with .ask',
    cooldown: 3,

    async execute({ sock, message, args, from, sender, command }) {
        const uid = sender;
        if (!history[uid]) history[uid] = [];
        if (!settings[uid]) settings[uid] = { provider: 'gemini' };

        // Check for voice reply
        let userText = args.join(' ').trim();
        let isVoiceReply = false;
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        const audioMsg = quoted?.audioMessage || quoted?.pttMessage;

        if (audioMsg && !userText) {
            isVoiceReply = true;
            await sock.sendMessage(from, { react: { text: '🎤', key: message.key } });
            const transcribed = await transcribeAudio(sock, message);
            if (!transcribed) return sock.sendMessage(from, { text: '❌ Could not transcribe.' }, { quoted: message });
            userText = transcribed;
            await sock.sendMessage(from, { text: `📝 *Transcribed:* ${transcribed}` }, { quoted: message });
        }

        // Provider selection
        let provider = settings[uid].provider || 'gemini';
        const first = (args[0] || '').toLowerCase();
        if (['gemini', 'groq', 'qwen'].includes(first)) {
            provider = first;
            settings[uid].provider = provider;
            saveSettings();
            userText = args.slice(1).join(' ').trim();
        }

        if (!userText) {
            return sock.sendMessage(from, { text: `❌ Usage: .ask <question>\n.ask groq <text>\n.ask qwen <text>\nReply VN with .ask\n\nProvider: ${provider}` }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '🤔', key: message.key } });

        history[uid].push({ role: 'user', content: userText });
        if (history[uid].length > MAX_HISTORY) history[uid] = history[uid].slice(-MAX_HISTORY);
        saveHistory();

        try {
            let reply;
            if (provider === 'gemini') reply = await askGemini(userText);
            else if (provider === 'groq') reply = await askGroq(userText);
            else reply = await askQwen(userText);

            history[uid].push({ role: 'assistant', content: reply });
            saveHistory();

            // Voice reply
            if (isVoiceReply) {
                const audioBuf = await tts(reply);
                if (audioBuf) {
                    await sock.sendMessage(from, { audio: audioBuf, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: message });
                    await sock.sendMessage(from, { react: { text: '🎵', key: message.key } });
                    return;
                }
            }

            await sock.sendMessage(from, { text: `🤖 *${provider}:* ${reply}` }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (e) {
            await sock.sendMessage(from, { text: `❌ ${provider} error: ${e.message}` }, { quoted: message });
        }
    }
};
