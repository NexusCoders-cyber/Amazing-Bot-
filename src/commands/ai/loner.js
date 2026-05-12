import axios from 'axios';

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const QWEN_BASE = process.env.QWEN_API_BASE_URL || '';
const QWEN_TOKEN = process.env.QWEN_TOKEN || process.env.QWEN_API_TOKEN || '';
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-plus';
const TTS_VOICE = process.env.LONER_TTS_VOICE || 'Joanna';
const CLAUDE_API_BASE_URL = process.env.CLAUDE_API_BASE_URL || 'https://omegatech-api.dixonomega.tech/api/ai';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'Claude-pro';

const defaults = { mode: 'chat', vn: false, history: [] };
const memory = new Map();
const REPLY_TTL = 10 * 60 * 1000;

async function tts(text) {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(TTS_VOICE)}&text=${encodeURIComponent(text.slice(0, 500))}`;
    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000 });
    return Buffer.from(data);
}

async function qwenChat(history, mode = 'chat') {
    try {
        if (QWEN_BASE && QWEN_TOKEN) {
            const { data } = await axios.post(`${QWEN_BASE.replace(/\/$/, '')}/chat/completions`, {
                model: mode === 'coder' ? (process.env.QWEN_CODER_MODEL || QWEN_MODEL) : QWEN_MODEL,
                messages: history
            }, {
                timeout: 120000,
                headers: { Authorization: `Bearer ${QWEN_TOKEN}`, 'Content-Type': 'application/json' }
            });
            const text = data?.choices?.[0]?.message?.content?.trim();
            if (text) return text;
        }
    } catch {}

    try {
        const { data } = await axios.post(`${GROQ_BASE_URL}/chat/completions`, {
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: history
        }, { headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, timeout: 120000 });
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
    } catch {}

    const { data } = await axios.get(`${CLAUDE_API_BASE_URL}/${encodeURIComponent(CLAUDE_MODEL)}`, {
        params: { prompt: history.map((h) => `${h.role}: ${h.content}`).join('\n').slice(-3500) },
        timeout: 120000
    });
    const text = data?.response?.trim();
    if (!text) throw new Error('No AI provider returned a response');
    return text;
}

export default {
    name: 'loner',
    aliases: ['qwenai', 'lonerai'],
    category: 'ai',
    description: 'Unified Qwen/Groq command with chat, coder, image, video and vn modes',
    usage: 'loner <prompt> | loner mode <chat|coder|image|video|vn on|vn off>',
    cooldown: 3,

    async execute({ sock, message, args, from, sender, prefix }) {
        const state = memory.get(sender) || { ...defaults };
        const register = (msgId) => {
            if (!msgId) return;
            if (!global.replyHandlers) global.replyHandlers = {};
            global.replyHandlers[msgId] = {
                command: 'loner',
                handler: async (replyText, replyMessage) => {
                    await this.execute({ sock, message: replyMessage, args: String(replyText || '').trim().split(/\s+/).filter(Boolean), from, sender, prefix });
                }
            };
            setTimeout(() => { if (global.replyHandlers?.[msgId]) delete global.replyHandlers[msgId]; }, REPLY_TTL);
        };
        const sub = (args[0] || '').toLowerCase();

        if (!args.length) {
            return sock.sendMessage(from, { text: `Usage:\n${prefix}loner mode <chat|coder|image|video|vn on|vn off>\n${prefix}loner <prompt>` }, { quoted: message });
        }

        if (sub === 'mode') {
            const mode = (args[1] || '').toLowerCase();
            if (mode === 'vn') {
                state.vn = (args[2] || '').toLowerCase() === 'on';
            } else if (['chat', 'coder', 'image', 'video'].includes(mode)) {
                state.mode = mode;
            } else {
                return sock.sendMessage(from, { text: '❌ Modes: chat, coder, image, video, vn on/off' }, { quoted: message });
            }
            memory.set(sender, state);
            return sock.sendMessage(from, { text: `✅ Loner mode: ${state.mode} | VN: ${state.vn ? 'ON' : 'OFF'}` }, { quoted: message });
        }

        const prompt = args.join(' ').trim();
        if (!prompt) return sock.sendMessage(from, { text: '❌ Enter prompt.' }, { quoted: message });

        if (state.mode === 'image') {
            const api = `https://theone-fast-image-gen.vercel.app/download-image?prompt=${encodeURIComponent(prompt)}&size=16%3A9`;
            const img = await axios.get(api, { responseType: 'arraybuffer', timeout: 60000 });
            return sock.sendMessage(from, { image: Buffer.from(img.data), caption: `Loner Image\n${prompt}` }, { quoted: message });
        }

        if (state.mode === 'video') {
            return sock.sendMessage(from, { text: `Use ${prefix}anivid for video output right now.` }, { quoted: message });
        }

        const system = state.mode === 'coder' ? 'You are coder-pro. Return clean code.' : 'You are Loner AI. Be clear and concise.';
        const history = [
            { role: 'system', content: system },
            ...state.history.slice(-14),
            { role: 'user', content: prompt }
        ];
        const answer = await qwenChat(history, state.mode);
        if (!answer) return sock.sendMessage(from, { text: '❌ Empty AI response.' }, { quoted: message });
        state.history.push({ role: 'user', content: prompt }, { role: 'assistant', content: answer });
        state.history = state.history.slice(-20);
        memory.set(sender, state);

        if (state.vn) {
            const audio = await tts(answer);
            const sent = await sock.sendMessage(from, { audio, mimetype: 'audio/mpeg', ptt: true }, { quoted: message });
            register(sent?.key?.id);
            return;
        }

        const sent = await sock.sendMessage(from, { text: answer }, { quoted: message });
        register(sent?.key?.id);
        return;
    }
};
