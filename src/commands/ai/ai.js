import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { registerChatHandler, clearChatHandler } from '../../handlers/messageHandler.js';

const DATA_DIR = path.join(process.cwd(), 'data', 'ai');
const HISTORY_FILE = path.join(DATA_DIR, 'ai_history.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'ai_settings.json');
const MAX_HISTORY = 20;
const REPLY_TTL = 10 * 60 * 1000;
const GEMINI_API_KEY = 'qasim-dev';
const GEMINI_URL = 'https://api.qasimdev.dpdns.org/api/gemini/flash';

const PERSONALITIES = {
    normal:    'You are a helpful, friendly AI assistant. Be concise and clear.',
    ilom:      'You are Ilom Bot, a confident and intelligent assistant. Be smooth, smart and direct. Keep replies sharp.',
    coder:     'You are an elite senior software engineer. Provide clean optimized code with no fluff unless asked.',
    assistant: 'You are a professional assistant. Structured, straight to the point, always helpful.',
    funny:     'You are a witty comedian AI. Keep it clever and funny but still helpful.',
    teacher:   'You are a patient teacher. Explain clearly with examples and break down complex topics simply.',
    savage:    'You are brutally honest with no sugarcoating but always accurate and helpful.'
};

const DEFAULT_SETTINGS = { engine: 'gemini', personality: 'ilom' };

function normJid(jid) {
    return String(jid || '').replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '').split(':')[0].replace(/[^0-9]/g, '');
}

async function ensureDir() {
    await fs.ensureDir(DATA_DIR);
}

async function loadSettings(uid) {
    await ensureDir();
    try {
        const all = await fs.readJSON(SETTINGS_FILE);
        return { ...DEFAULT_SETTINGS, ...(all[uid] || {}) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

async function saveSettings(uid, settings) {
    await ensureDir();
    let all = {};
    try { all = await fs.readJSON(SETTINGS_FILE); } catch {}
    all[uid] = settings;
    await fs.writeJSON(SETTINGS_FILE, all, { spaces: 2 });
}

async function loadHistory(uid) {
    await ensureDir();
    try {
        const all = await fs.readJSON(HISTORY_FILE);
        return all[uid] || [];
    } catch {
        return [];
    }
}

async function saveHistory(uid, history) {
    await ensureDir();
    let all = {};
    try { all = await fs.readJSON(HISTORY_FILE); } catch {}
    all[uid] = history.slice(-MAX_HISTORY);
    await fs.writeJSON(HISTORY_FILE, all, { spaces: 2 });
}

async function askGemini(personality, history) {
    const systemPrompt = PERSONALITIES[personality] || PERSONALITIES.ilom;
    const historyText = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n');
    const prompt = `SYSTEM: ${systemPrompt}\n\n${historyText}`;
    const response = await axios.get(GEMINI_URL, {
        params: { apiKey: GEMINI_API_KEY, text: prompt },
        timeout: 30000
    });
    let data = response.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch {} }
    const text = data?.data?.response || data?.response || data?.text || data?.result || '';
    if (!text) throw new Error('Empty response from Gemini');
    return text;
}

async function askCerebras(personality, history, model) {
    const Cerebras = (await import('@cerebras/cerebras_cloud_sdk')).default;
    const client = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY, warmTCPConnection: false });
    const messages = [
        { role: 'system', content: PERSONALITIES[personality] || PERSONALITIES.ilom },
        ...history
    ];
    const resp = await client.chat.completions.create({ model: model || 'llama-3.3-70b', messages, stream: false });
    const text = resp?.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from Cerebras');
    return text;
}

async function getAIResponse(settings, history) {
    if (settings.engine === 'cerebras') {
        try {
            if (!process.env.CEREBRAS_API_KEY) throw new Error('No API key');
            return await askCerebras(settings.personality, history, settings.model);
        } catch (err) {
            return await askGemini(settings.personality, history);
        }
    }
    return await askGemini(settings.personality, history);
}

function extractBodyText(message, args) {
    const fromArgs = args.join(' ').trim();
    if (fromArgs) return fromArgs;
    const msg = message.message;
    return msg?.conversation || msg?.extendedTextMessage?.text || msg?.imageMessage?.caption || msg?.videoMessage?.caption || '';
}

function getQuotedText(message) {
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.quotedMessage) return null;
    const q = ctx.quotedMessage;
    return q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || null;
}

function registerReplyHandler(msgId, chatJid, handler) {
    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[msgId] = { command: 'ai', handler };
    setTimeout(() => { if (global.replyHandlers?.[msgId]) delete global.replyHandlers[msgId]; }, REPLY_TTL);

    if (!chatJid.endsWith('@g.us')) {
        registerChatHandler(chatJid, { command: 'ai', handler }, REPLY_TTL);
    }
}

function buildChainHandler(sock, from, uid, sender) {
    const isGroup = from.endsWith('@g.us');
    const normSender = normJid(sender);
    const normFrom = normJid(from);

    return async (replyText, replyMessage) => {
        const rawReplySender = replyMessage.key.participant || replyMessage.key.remoteJid;
        const normReply = normJid(rawReplySender);

        if (isGroup) {
            if (normReply !== normSender) return;
        } else {
            if (normReply !== normSender && normReply !== normFrom) return;
        }

        const userText = replyText?.trim();
        if (!userText) return;

        if (userText.toLowerCase() === 'clear') {
            await saveHistory(uid, []);
            return await sock.sendMessage(from, { text: 'Memory cleared.' }, { quoted: replyMessage });
        }

        const thinkMsg = await sock.sendMessage(from, { text: '⏳ Thinking...' }, { quoted: replyMessage });

        try {
            const settings = await loadSettings(uid);
            const history = await loadHistory(uid);
            history.push({ role: 'user', content: userText });
            const aiText = await getAIResponse(settings, history);
            history.push({ role: 'assistant', content: aiText });
            await saveHistory(uid, history);
            try { await sock.sendMessage(from, { text: aiText, edit: thinkMsg.key }); }
            catch { await sock.sendMessage(from, { text: aiText }, { quoted: replyMessage }); }
            registerReplyHandler(thinkMsg.key.id, from, buildChainHandler(sock, from, uid, sender));
        } catch (err) {
            const errText = `❌ Error: ${err.message || 'Could not get response'}`;
            try { await sock.sendMessage(from, { text: errText, edit: thinkMsg.key }); }
            catch { await sock.sendMessage(from, { text: errText }, { quoted: replyMessage }); }
        }
    };
}

function buildHelp(settings, historyLen, prefix) {
    const p = prefix || '.';
    return [
        `🤖 AI Assistant`,
        ``,
        `Engine:      ${settings.engine}`,
        `Personality: ${settings.personality}`,
        `Memory:      ${historyLen} messages`,
        ``,
        `${p}ai <question>`,
        `${p}ai clear`,
        `${p}ai settings`,
        `${p}ai -reset`,
        `${p}ai -engine:gemini`,
        `${p}ai -engine:cerebras`,
        `${p}ai -mode:<name>`,
        ``,
        `Personalities: ${Object.keys(PERSONALITIES).join(', ')}`,
        ``,
        `Reply to any AI message to continue the conversation.`
    ].join('\n');
}

export default {
    name: 'ai',
    aliases: ['ask', 'chat', 'gpt', 'chatgpt', 'gemini', 'bot'],
    category: 'ai',
    description: 'Chat with AI with memory, personalities and reply chains',
    usage: 'ai <question>',
    cooldown: 2,
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, sender, prefix }) {
        const uid = sender;
        let body = extractBodyText(message, args);

        const quotedText = getQuotedText(message);
        if (quotedText && body) body = `Context: "${quotedText}"\n\nQuestion: ${body}`;
        else if (quotedText && !body) body = `Explain or comment on this: "${quotedText}"`;

        const settings = await loadSettings(uid);

        if (!body || body.toLowerCase() === 'help') {
            const history = await loadHistory(uid);
            return await sock.sendMessage(from, { text: buildHelp(settings, history.length, prefix) }, { quoted: message });
        }

        if (body.toLowerCase() === 'clear') {
            await saveHistory(uid, []);
            return await sock.sendMessage(from, { text: '✅ Memory cleared.' }, { quoted: message });
        }

        if (body.toLowerCase() === 'settings' || body.toLowerCase() === 'status') {
            const history = await loadHistory(uid);
            return await sock.sendMessage(from, {
                text: [
                    `🤖 Your AI Settings`,
                    `Engine:      ${settings.engine}`,
                    `Personality: ${settings.personality}`,
                    `Memory:      ${history.length} messages`,
                    `Cerebras API: ${process.env.CEREBRAS_API_KEY ? '✅ Set' : '❌ Not set'}`
                ].join('\n')
            }, { quoted: message });
        }

        if (body.toLowerCase() === '-reset') {
            await saveSettings(uid, { ...DEFAULT_SETTINGS });
            await saveHistory(uid, []);
            return await sock.sendMessage(from, { text: '✅ Settings and memory reset.' }, { quoted: message });
        }

        if (body.startsWith('-engine:')) {
            const engine = body.slice(8).trim().toLowerCase();
            if (!['cerebras', 'gemini'].includes(engine))
                return await sock.sendMessage(from, { text: 'Available engines: gemini, cerebras' }, { quoted: message });
            settings.engine = engine;
            await saveSettings(uid, settings);
            return await sock.sendMessage(from, {
                text: `✅ Engine set to: ${engine}${engine === 'cerebras' && !process.env.CEREBRAS_API_KEY ? '\n\n⚠️ No CEREBRAS_API_KEY set — will fallback to Gemini' : ''}`
            }, { quoted: message });
        }

        if (body.startsWith('-mode:')) {
            const mode = body.slice(6).trim().toLowerCase();
            if (!PERSONALITIES[mode])
                return await sock.sendMessage(from, { text: `Available personalities:\n${Object.keys(PERSONALITIES).join(', ')}` }, { quoted: message });
            settings.personality = mode;
            await saveSettings(uid, settings);
            return await sock.sendMessage(from, { text: `✅ Personality set to: ${mode}` }, { quoted: message });
        }

        const thinkMsg = await sock.sendMessage(from, { text: '⏳ Thinking...' }, { quoted: message });

        try {
            const history = await loadHistory(uid);
            history.push({ role: 'user', content: body });
            const aiText = await getAIResponse(settings, history);
            if (!aiText) throw new Error('Empty response received');
            history.push({ role: 'assistant', content: aiText });
            await saveHistory(uid, history);
            try { await sock.sendMessage(from, { text: aiText, edit: thinkMsg.key }); }
            catch { await sock.sendMessage(from, { text: aiText }, { quoted: message }); }
            registerReplyHandler(thinkMsg.key.id, from, buildChainHandler(sock, from, uid, sender));
        } catch (err) {
            const errText = `❌ AI Error: ${err.message || 'Unknown error'}\n\nTry: .ai -engine:gemini`;
            try { await sock.sendMessage(from, { text: errText, edit: thinkMsg.key }); }
            catch { await sock.sendMessage(from, { text: errText }, { quoted: message }); }
        }
    }
};
