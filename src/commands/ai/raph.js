import fs from 'fs';
import path from 'path';
import axios from 'axios';

const DB_PATH = path.join(process.cwd(), 'database', 'raph_db.json');
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const SYSTEM = 'You are Raph. Human-like, witty, short replies.';
const CLAUDE_API_BASE_URL = process.env.CLAUDE_API_BASE_URL || 'https://omegatech-api.dixonomega.tech/api/ai';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'Claude-pro';

function initDb() {
    if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ chats: {}, global: { all: false, private: false, voice: true } }, null, 2));
}
function getDb() { initDb(); return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
function saveDb(v) { fs.writeFileSync(DB_PATH, JSON.stringify(v, null, 2)); }

async function ask(text) {
    try {
        const { data } = await axios.get('https://apis.prexzyvilla.site/ai/gpt-5', {
            params: { text: `${SYSTEM}\n\n${text}` },
            timeout: 90000
        });
        const reply = data?.result || data?.response || data?.data || data?.message;
        if (reply) return String(reply).trim();
    } catch {}

    try {
        const { data } = await axios.post(`${GROQ_BASE_URL}/chat/completions`, {
            model: GROQ_MODEL,
            messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }],
            temperature: 0.7,
            max_tokens: 300
        }, { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 90000 });
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply) return reply;
    } catch {}

    const fallback = await axios.get(`${CLAUDE_API_BASE_URL}/${encodeURIComponent(CLAUDE_MODEL)}`, {
        params: { prompt: `${SYSTEM}\n\n${text}` },
        timeout: 90000
    });
    return fallback?.data?.response?.trim();
}

async function tts(text) {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=Joanna&text=${encodeURIComponent(text.slice(0, 320))}`;
    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000 });
    return Buffer.from(data);
}

function registerRaph(sock, chatJid = '*') {
    if (!global.chatHandlers) global.chatHandlers = {};
    global.chatHandlers[chatJid] = {
        command: 'raph',
        handler: async (text, incomingMessage) => {
            if (!text || /^[.!#/]/.test(text)) return;
            if (incomingMessage.key.fromMe) return;
            const targetChat = incomingMessage.key.remoteJid || chatJid;
            const db = getDb();
            const chatCfg = db.chats[targetChat] || {};
            const isPrivate = !String(targetChat).endsWith('@g.us');
            const enabled = chatCfg.enabled === true || db.global.all || (isPrivate && db.global.private);
            if (!enabled) return;

            const reply = await ask(text);
            if (!reply) return;
            if (db.global.voice) {
                const audio = await tts(reply);
                await sock.sendMessage(targetChat, { audio, mimetype: 'audio/mpeg', ptt: false }, { quoted: incomingMessage });
                return;
            }
            await sock.sendMessage(targetChat, { text: reply }, { quoted: incomingMessage });
        }
    };
}

export default {
    name: 'raph',
    aliases: ['trishaauto', 'autoai'],
    category: 'ai',
    description: 'Auto AI responder (toggle by chat/global/private) using Groq',
    usage: 'raph on|off|on /all|off /all|on /private|off /private|on /voice|off /voice',
    cooldown: 2,

    async execute({ sock, message, args, from }) {
        const db = getDb();
        if ((db.global.all || db.global.private) && !global.chatHandlers?.['*']) registerRaph(sock, '*');
        const action = (args[0] || '').toLowerCase();
        const target = (args[1] || '').toLowerCase();

        if (action === 'help') {
            return sock.sendMessage(from, {
                text: '✨ RAPH HELP\n• raph on/off\n• raph on/off /all\n• raph on/off /private\n• raph on/off /voice'
            }, { quoted: message });
        }

        if (!['on', 'off'].includes(action)) {
            return sock.sendMessage(from, {
                text: '✨ RAPH AUTO AI\n• raph on/off\n• raph on/off /all\n• raph on/off /private\n• raph on/off /voice'
            }, { quoted: message });
        }

        const enable = action === 'on';
        if (target === '/all') {
            db.global.all = enable;
            if (enable) registerRaph(sock, '*');
            else if (!db.global.private && global.chatHandlers?.['*']) delete global.chatHandlers['*'];
        } else if (target === '/private') {
            db.global.private = enable;
            if (enable) registerRaph(sock, '*');
            else if (!db.global.all && global.chatHandlers?.['*']) delete global.chatHandlers['*'];
        } else if (target === '/voice') db.global.voice = enable;
        else {
            if (!db.chats[from]) db.chats[from] = {};
            db.chats[from].enabled = enable;
            if (enable) registerRaph(sock, from);
            else if (global.chatHandlers?.[from]) delete global.chatHandlers[from];
        }

        saveDb(db);
        return sock.sendMessage(from, { text: `✅ Raph ${enable ? 'enabled' : 'disabled'} ${target || 'for this chat'}` }, { quoted: message });
    }
};
