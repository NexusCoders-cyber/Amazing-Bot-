import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

dotenv.config();

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROG_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_ILOM_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_TEXT_MODEL = process.env.GEMINI_ILOM_MODEL || 'gemini-2.0-flash';
const GEMINI_VISION_MODEL = process.env.GEMINI_ILOM_VISION_MODEL || GEMINI_TEXT_MODEL;

const MEMORY_PATH = './data/ilom_memory.json';
const REPO_ROOT = process.cwd();
const LOW_RESOURCE_MODE = process.env.LOW_RESOURCE_MODE === 'true';
const LONG_OUTPUT_LIMIT = LOW_RESOURCE_MODE ? 2200 : 3500;
const REPLY_TTL = 10 * 60 * 1000;
const BOT_JID = process.env.BOT_JID || '867051314767696@bot';

const ASSEMBLY_API_KEY = process.env.ASSEMBLYAI_API_KEY || '';

async function transcribeAudioFromMessage(sock, message) {
    if (!ASSEMBLY_API_KEY) return '';
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const ownAudio = message.message?.audioMessage;
    const target = quoted?.audioMessage ? { message: quoted } : ownAudio ? message : null;
    if (!target) return '';
    const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
    const up = await axios.post('https://api.assemblyai.com/v2/upload', buffer, { headers: { authorization: ASSEMBLY_API_KEY, 'content-type': 'application/octet-stream' }, timeout: 120000 });
    const create = await axios.post('https://api.assemblyai.com/v2/transcript', { audio_url: up.data.upload_url, language_detection: true }, { headers: { authorization: ASSEMBLY_API_KEY }, timeout: 60000 });
    for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const check = await axios.get(`https://api.assemblyai.com/v2/transcript/${create.data.id}`, { headers: { authorization: ASSEMBLY_API_KEY }, timeout: 60000 });
        if (check.data.status === 'completed') return check.data.text || '';
        if (check.data.status === 'error') return '';
    }
    return '';
}

function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return {};
        return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveMemory(data) {
    fs.mkdirSync(path.dirname(MEMORY_PATH), { recursive: true });
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2));
}

function stripTrailingDetailsBlock(text) {
    const trimmedEnd = String(text || '').replace(/\s+$/g, '');
    const closeTag = '</details>';
    const lower = trimmedEnd.toLowerCase();
    const closeIndex = lower.lastIndexOf(closeTag);
    if (closeIndex < 0 || closeIndex + closeTag.length !== trimmedEnd.length) return String(text || '');
    const openIndex = lower.lastIndexOf('<details', closeIndex);
    if (openIndex < 0) return String(text || '');
    return trimmedEnd.slice(0, openIndex).trimEnd();
}

function getModePrompt(mode) {
    return `
You are ILOMCREATE Agent.

STRICT RULES:
- You operate from the bot root folder and can reason about logs, src, temp, and data folders.
- For code tasks return final code directly; no markdown wrappers.
- Never output <think> or hidden reasoning.
- Keep responses concise and production-safe.
- Default behavior is normal chat assistant.
- Only generate command files when user explicitly asks to create/build/generate a command.
- Use this command shape by default whenever generating a command:
  export default { name, aliases, category, description, usage, cooldown, async execute({ sock, message, args, from, sender, prefix }) { ... } }.
- If user asks to use tools/function calls, design output for OpenAI-style tool calling and include safe guardrails against shell bypass tricks (like cat-based exfiltration).

CURRENT MODE: ${mode}
`;
}

function getRepoSnapshot() {
    const probes = ['logs', 'temp', 'downloads', 'data'];
    const lines = [];
    for (const probe of probes) {
        const full = path.join(REPO_ROOT, probe);
        if (!fs.existsSync(full)) continue;
        try {
            const entries = fs.readdirSync(full);
            lines.push(`${probe}: ${entries.length} entries`);
        } catch {}
    }
    return lines.join('\n');
}

async function askGroqChat(systemPrompt, userPrompt) {
    if (!GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY');
    const { data } = await axios.post(`${GROQ_BASE_URL}/chat/completions`, {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: LOW_RESOURCE_MODE ? 0.2 : 0.4,
        max_tokens: LOW_RESOURCE_MODE ? 950 : 1800
    }, {
        timeout: LOW_RESOURCE_MODE ? 70000 : 120000,
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
    });

    const raw = data?.choices?.[0]?.message?.content || '';
    const cleaned = stripTrailingDetailsBlock(String(raw).replace(/<think>[\s\S]*?<\/think>/gi, '').trim());
    if (!cleaned) throw new Error('Groq returned empty response');
    return cleaned;
}

async function askGeminiText(systemPrompt, userPrompt) {
    if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const { data } = await axios.post(endpoint, {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
            temperature: LOW_RESOURCE_MODE ? 0.2 : 0.4,
            maxOutputTokens: LOW_RESOURCE_MODE ? 1000 : 1800
        }
    }, {
        timeout: LOW_RESOURCE_MODE ? 70000 : 120000,
        headers: { 'Content-Type': 'application/json' }
    });

    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join(' ').trim();
    if (!text) throw new Error('Gemini returned empty response');
    return stripTrailingDetailsBlock(String(text));
}

async function askIlomApi(prompt, question) {
    const normalizedQuestion = String(question || 'Continue').slice(0, 4000);
    const composed = `${prompt}\n\n${normalizedQuestion}`;

    try {
        return await askGroqChat(prompt, normalizedQuestion);
    } catch {}

    try {
        return await askGeminiText(prompt, normalizedQuestion);
    } catch {}

    const { data } = await axios.post('https://qwen.aikit.club/v1/chat/completions', {
        model: process.env.QWEN_MODEL || 'Qwen3.6-Plus',
        messages: [{ role: 'user', content: composed }]
    }, {
        timeout: LOW_RESOURCE_MODE ? 70000 : 120000,
        headers: {
            Authorization: `Bearer ${process.env.QWEN_API_KEY || process.env.QWEN_ACCESS_TOKEN || ''}`,
            'Content-Type': 'application/json'
        }
    });
    const out = data?.choices?.[0]?.message?.content || data?.result || data?.response || data?.data || data?.message;
    if (!out) throw new Error('All AI providers failed for ilomcreate');
    return stripTrailingDetailsBlock(String(out).trim());
}

async function generateIlomImage() {
    throw new Error('Image generation is disabled in ilomcreate. Use dedicated image commands instead.');
}

async function captureWebsite(url, quality = 'hd') {
    const width = quality === 'fhd' ? 1920 : 1366;
    const apiUrl = `https://api.screenshotone.com/take?access_key=KN3bMn5VoWZIWw&url=${encodeURIComponent(url)}&format=jpg&full_page=true&block_ads=true&block_cookie_banners=true&block_trackers=true&viewport_width=${width}&image_quality=80&response_type=by_format`;
    const { data } = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 65000 });
    return Buffer.from(data);
}

async function generateIlomVideo() {
    throw new Error('Video generation is disabled in ilomcreate. Use dedicated video commands instead.');
}

async function analyzeImageWithQwen(buffer, prompt) {
    if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY for image analysis');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const { data } = await axios.post(endpoint, {
        contents: [{
            role: 'user',
            parts: [
                { text: prompt || 'Describe this image in detail.' },
                {
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: Buffer.from(buffer).toString('base64')
                    }
                }
            ]
        }]
    }, {
        timeout: 120000,
        headers: { 'Content-Type': 'application/json' }
    });

    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join(' ').trim();
    if (!text) throw new Error('Gemini did not return image analysis text');
    return text;
}

function getQuotedMessage(message) {
    return message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
}

function registerReplyHandler(msgId, handler) {
    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[msgId] = { command: 'ilomcreate', handler };
    setTimeout(() => { if (global.replyHandlers?.[msgId]) delete global.replyHandlers[msgId]; }, REPLY_TTL);
}

function normalizeText(raw = '') {
    return String(raw || '').trim();
}

function detectLang(fileName = 'code.js') {
    const ext = path.extname(fileName).toLowerCase();
    const map = { '.js': 'javascript', '.ts': 'typescript', '.json': 'json', '.py': 'python', '.sh': 'bash', '.md': 'markdown' };
    return map[ext] || 'text';
}

function tokenize(codeStr, lang = 'javascript') {
    const keywords = {
        javascript: ['import', 'export', 'const', 'let', 'var', 'function', 'return', 'async', 'await', 'class', 'new', 'if', 'else', 'for', 'while', 'try', 'catch'],
        typescript: ['import', 'export', 'const', 'let', 'var', 'function', 'return', 'async', 'await', 'class', 'interface', 'type', 'enum'],
        python: ['import', 'from', 'def', 'return', 'class', 'if', 'else', 'for', 'while', 'try', 'except']
    };
    const langKeys = keywords[lang] || keywords.javascript;
    return String(codeStr || '').split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return { highlightType: 0, codeContent: `${line}\n` };
        if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--') || trimmed.startsWith('*')) return { highlightType: 4, codeContent: `${line}\n` };
        const hasKeyword = langKeys.some((kw) => new RegExp(`(^|\\s|\\(|;)${kw}(\\s|\\(|;|$|:)`).test(trimmed));
        if (hasKeyword) return { highlightType: 1, codeContent: `${line}\n` };
        if (trimmed.includes('(')) return { highlightType: 3, codeContent: `${line}\n` };
        if ((line.match(/"/g) || []).length >= 2 || (line.match(/'/g) || []).length >= 2) return { highlightType: 2, codeContent: `${line}\n` };
        return { highlightType: 0, codeContent: `${line}\n` };
    });
}

async function sendNativeCodeBlock(sock, jid, codeContent, fileName = 'code.js') {
    const lang = detectLang(fileName);
    const blocks = tokenize(codeContent, lang);
    return sock.relayMessage(jid, {
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 5, codeMetadata: { codeLanguage: lang, codeBlocks: blocks } }],
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: BOT_JID },
                        forwardOrigin: 4
                    }
                }
            }
        }
    }, {});
}

export default {
    name: 'ilomcreate',
    aliases: ['ilom', 'agent', 'cmdai'],
    category: 'ai',
    description: 'Autonomous AI command creator + installer',
    usage: 'ilomcreate <prompt>',
    cooldown: 3,
    permissions: ['user'],
    minArgs: 0,

    async execute({ sock, message, args, from, sender }) {
        try {
            const memory = loadMemory();
            const userMemory = memory[sender] || { history: [], mode: 'chat' };

            const quoted = getQuotedMessage(message);
            let userText = normalizeText(args.join(' '));

            if (!userText && (message.message?.audioMessage || quoted?.audioMessage)) {
                const transcript = await transcribeAudioFromMessage(sock, message);
                if (transcript) userText = normalizeText(transcript);
            }

            if (!userText && quoted) userText = 'Continue previous task.';

            if (!userText) {
                return sock.sendMessage(from, {
                    text: '❌ Provide a prompt or reply to continue.\nTip: use "ilom help" for command list.'
                }, { quoted: message });
            }

            if (/^help$/i.test(userText)) {
                return sock.sendMessage(from, {
                    text: '🤖 Ilom Help\n• ilom <prompt>\n• ilom img <prompt>\n• ilom video <prompt>\n• ilom screenshot <url> [hd|fhd]\n• ilom clear'
                }, { quoted: message });
            }


            if (/^(img|image)\s+/i.test(userText)) {
                const prompt = userText.replace(/^(img|image)\s+/i, '').trim();
                if (!prompt) {
                    return sock.sendMessage(from, { text: '❌ Usage: ilom img <prompt>' }, { quoted: message });
                }
                await sock.sendMessage(from, { text: '🎨 Image generation is not supported in ilomcreate right now.' }, { quoted: message });
                const imageUrl = await generateIlomImage(prompt);
                return sock.sendMessage(from, { image: { url: imageUrl }, caption: `✅ Ilom image generated\nPrompt: ${prompt}` }, { quoted: message });
            }
            if (/^(vid|video)\s+/i.test(userText)) {
                const prompt = userText.replace(/^(vid|video)\s+/i, '').trim();
                if (!prompt) return sock.sendMessage(from, { text: '❌ Usage: ilom video <prompt>' }, { quoted: message });
                await sock.sendMessage(from, { text: '🎬 Video generation is not supported in ilomcreate right now.' }, { quoted: message });
                const videoUrl = await generateIlomVideo(prompt);
                if (!videoUrl) return sock.sendMessage(from, { text: '✅ Video request accepted but no downloadable URL was returned yet.' }, { quoted: message });
                return sock.sendMessage(from, { video: { url: videoUrl }, caption: `✅ Ilom video generated\nPrompt: ${prompt}` }, { quoted: message });
            }
            if (/^(models|list models)$/i.test(userText)) {
                return sock.sendMessage(from, { text: `🧠 ilomcreate providers\n• Groq model: ${GROQ_MODEL}\n• Gemini model: ${GEMINI_TEXT_MODEL}\n• Gemini vision: ${GEMINI_VISION_MODEL}` }, { quoted: message });
            }

            if (/^(screen|screenshot|ss)\s+/i.test(userText)) {
                const rest = userText.replace(/^(screen|screenshot|ss)\s+/i, '').trim();
                const [urlCandidate, qualityCandidate] = rest.split(/\s+/);
                if (!/^https?:\/\//i.test(String(urlCandidate || ''))) {
                    return sock.sendMessage(from, { text: '❌ Usage: ilom screenshot <https://url> [hd|fhd]' }, { quoted: message });
                }
                const quality = ['hd', 'fhd'].includes(String(qualityCandidate || '').toLowerCase())
                    ? String(qualityCandidate).toLowerCase()
                    : 'hd';
                await sock.sendMessage(from, { text: `📸 Capturing ${quality.toUpperCase()} screenshot...` }, { quoted: message });
                const shot = await captureWebsite(urlCandidate, quality);
                return sock.sendMessage(from, { image: shot, caption: `📸 ${urlCandidate}` }, { quoted: message });
            }

            if (userText.startsWith('mode:')) {
                const mode = userText.split(':')[1]?.trim();
                if (!mode) {
                    return sock.sendMessage(from, { text: '❌ Usage: mode:<chat|coder|pro|friendly|savage|scraper>' }, { quoted: message });
                }

                userMemory.mode = mode;
                memory[sender] = userMemory;
                saveMemory(memory);

                return sock.sendMessage(from, {
                    text: `🎭 Mode switched → *${mode}*`
                }, { quoted: message });
            }

            let fileCode = '';
            if (quoted?.documentMessage) {
                const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, sock);
                fileCode = buffer.toString('utf8').slice(0, LOW_RESOURCE_MODE ? 5000 : 10000);
            }
            if (quoted?.imageMessage) {
                const imageBuffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, sock);
                const prompt = userText && !/^(analyze|describe)$/i.test(userText) ? userText : 'Describe this image clearly.';
                const vision = await analyzeImageWithQwen(imageBuffer, prompt);
                const sentVision = await sock.sendMessage(from, { text: vision || 'No image insight returned.' }, { quoted: message });
                if (sentVision?.key?.id) {
                    registerReplyHandler(sentVision.key.id, async (replyText, replyMessage) => {
                        await this.execute({ sock, message: replyMessage, args: [replyText], from, sender });
                    });
                }
                return;
            }

            const historyText = userMemory.history
                .slice(-8)
                .map((h) => `${h.role}: ${h.text}`)
                .join('\n');

            const wantsCreateCommand = /\b(create|build|generate)\b[\s\w-]{0,20}\b(command|cmd)\b/i.test(userText);
            const finalPrompt = `${getModePrompt(userMemory.mode)}
ROOT SNAPSHOT:
${getRepoSnapshot() || 'No snapshot available'}

CHAT HISTORY:
${historyText}

${fileCode ? `CODE:\n${fileCode}` : ''}

USER:\n${userText}

COMMAND TEMPLATE REQUIREMENT:
- When creating commands, output complete JS command file using export default.
- Include: name, category, description, usage, cooldown, and execute().
- Never auto-install or auto-save files. Always return code directly in chat.
- If user did not explicitly request to create/build/generate a command, respond as normal assistant text only (no command file output).
- Prefer raw code output without markdown wrappers.`;

            const output = await askIlomApi(finalPrompt, userText);

            userMemory.history.push({ role: 'user', text: userText });
            userMemory.history.push({ role: 'ai', text: output });
            memory[sender] = userMemory;
            saveMemory(memory);

            const generatedCode = String(output || '').trim();
            const looksLikeCode = wantsCreateCommand && (generatedCode.includes('export default') || generatedCode.includes('module.exports') || generatedCode.includes('function '));
            if (looksLikeCode) {
                const sentInfo = await sock.sendMessage(from, {
                    text: `📄 *Generated command output*\nMode: Native code view\nLines: ${generatedCode.split('\n').length}\nSize: ${Buffer.byteLength(generatedCode, 'utf8')} bytes`
                }, { quoted: message });
                await sendNativeCodeBlock(sock, from, generatedCode, 'generated-command.js');
                if (sentInfo?.key?.id) {
                    registerReplyHandler(sentInfo.key.id, async (replyText, replyMessage) => {
                        await this.execute({ sock, message: replyMessage, args: [replyText], from, sender });
                    });
                }
                return;
            }

            if (output.length > LONG_OUTPUT_LIMIT) {
                const fileName = `ilom_${Date.now()}.txt`;
                const filePath = path.join('./temp', fileName);

                fs.mkdirSync('./temp', { recursive: true });
                fs.writeFileSync(filePath, output);

                const sent = await sock.sendMessage(from, {
                    document: fs.readFileSync(filePath),
                    fileName,
                    mimetype: 'text/plain'
                }, { quoted: message });
                if (sent?.key?.id) {
                    registerReplyHandler(sent.key.id, async (replyText, replyMessage) => {
                        await this.execute({ sock, message: replyMessage, args: [replyText], from, sender });
                    });
                }
                return;
            }

            const sent = await sock.sendMessage(from, { text: output }, { quoted: message });
            if (sent?.key?.id) {
                registerReplyHandler(sent.key.id, async (replyText, replyMessage) => {
                    await this.execute({ sock, message: replyMessage, args: [replyText], from, sender });
                });
            }
        } catch (err) {
            await sock.sendMessage(from, {
                text: `❌ AI Error: ${err.message}\n\nTry again shortly.`
            }, { quoted: message });
        }
    }
};
