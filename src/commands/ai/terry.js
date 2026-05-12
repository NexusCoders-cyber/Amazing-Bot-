import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isTopOwner } from '../../utils/privilegedUsers.js';

const execAsync = promisify(exec);
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://qwen.aikit.club/v1';
const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.QWEN_ACCESS_TOKEN || '';
const QWEN_MODEL = process.env.QWEN_MODEL || 'Qwen3.6-Plus';
const QWEN_IMAGE_MODEL = process.env.QWEN_IMAGE_MODEL || 'Qwen-Image';
const LOG_FILE = path.join(process.cwd(), 'logs', 'combined.log');

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function isSafeShell(cmd) {
    const safePrefixes = [
        'pwd', 'ls', 'cat ', 'rg ', 'node -v', 'npm -v', 'git status', 'pm2 logs --lines'
    ];
    const blocked = /(rm\s+-rf|shutdown|reboot|mkfs|dd\s+if=|:\(\)\{|curl\s+.*\|\s*sh|wget\s+.*\|\s*sh)/i;
    if (blocked.test(cmd)) return false;
    return safePrefixes.some((p) => cmd === p || cmd.startsWith(p));
}

const providerState = global.terryProvider || (global.terryProvider = new Map());
const terryMemory = global.terryMemory || (global.terryMemory = new Map());

async function geminiChat(prompt, history = []) {
    if (!process.env.GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const merged = [...history.slice(-6), { role: 'user', content: prompt }].map((m)=>`${m.role}: ${m.content}`).join('\n');
    const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, { contents: [{ parts: [{ text: merged }] }] }, { timeout: 90000 });
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response';
}

async function qwenChat(prompt, history = []) {
    try {
        const { data } = await axios.get('https://apis.prexzyvilla.site/ai/gpt-5', {
            params: { text: prompt },
            timeout: 120000
        });
        const answer = data?.result || data?.response || data?.data?.response || data?.message;
        if (answer) return String(answer).trim();
    } catch (err) {
        if (![404, 410].includes(err?.response?.status)) throw err;
    }

    if (!QWEN_API_KEY) throw new Error('Missing QWEN_API_KEY');
    const { data } = await axios.post(`${QWEN_BASE_URL}/chat/completions`, {
        model: QWEN_MODEL,
        messages: [{ role: 'system', content: 'You are Terry, the Amazing-Bot maintenance agent. Give concise, practical fixes and exact file paths.' }, ...history.slice(-6), { role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1400
    }, { timeout: 120000, headers: { Authorization: `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' } });
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty response from AI');
    return text;
}


async function groqChat(prompt, history = []) {
    if (!process.env.GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY');
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', { model, messages: [{ role: 'system', content: 'You are Terry, a coding and maintenance agent.' }, ...history.slice(-6), { role: 'user', content: prompt }] }, { timeout: 120000, headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' } });
    return data?.choices?.[0]?.message?.content?.trim() || 'No response';
}
async function qwenImage(prompt) {
    if (!QWEN_API_KEY) throw new Error('Missing QWEN_API_KEY');
    const { data } = await axios.post(`${QWEN_BASE_URL}/images/generations`, {
        model: QWEN_IMAGE_MODEL,
        prompt,
        size: '1024x1024'
    }, {
        timeout: 180000,
        headers: { Authorization: `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' }
    });

    return data?.data?.[0]?.url || data?.url || null;
}

async function tailLogs(lines = 120) {
    if (!(await fs.pathExists(LOG_FILE))) return 'No log file found at logs/combined.log';
    const content = await fs.readFile(LOG_FILE, 'utf8');
    return content.split('\n').slice(-clamp(lines, 20, 500)).join('\n');
}

export default {
    name: 'terry',
    aliases: ['agentterry', 'maintainer'],
    category: 'ai',
    description: 'Root maintenance agent for bot diagnostics, Qwen text/image, and safe shell checks',
    usage: 'terry <prompt> | terry provider <qwen|gemini|grok> | terry img <prompt> | terry logs [n] | terry sh <cmd>',
    cooldown: 3,

    async execute({ sock, message, from, args, sender }) {
        try {
            const input = args.join(' ').trim();
            if (!input) {
                return sock.sendMessage(from, {
                    text: '🤖 Terry\n\nUsage:\n• terry <question>\n• terry help\n• terry img <prompt>\n• terry logs [n]\n• terry bugs <code>\n• terry sh <safe-command> (owner)'
                }, { quoted: message });
            }
            if (/^help$/i.test(input)) {
                return sock.sendMessage(from, {
                    text: '🤖 Terry Help\n\n• terry <question> -> GPT-5 root AI chat\n• terry img <prompt> -> image generation\n• terry logs [n] -> diagnostics\n• terry bugs <code> -> bug detector API\n• terry sh <safe-command> -> owner safe shell'
                }, { quoted: message });
            }

            if (/^img\s+/i.test(input)) {
                const prompt = input.replace(/^img\s+/i, '').trim();
                if (!prompt) return sock.sendMessage(from, { text: '❌ Usage: terry img <prompt>' }, { quoted: message });
                await sock.sendMessage(from, { text: '🎨 Terry generating image...' }, { quoted: message });
                const url = process.env.FLUX_API_URL ? (await axios.post(process.env.FLUX_API_URL, { prompt }, { headers: { Authorization: `Bearer ${process.env.FLUX_API_KEY || ''}` }, timeout: 180000 })).data?.url : await qwenImage(prompt);
                if (!url) throw new Error('No image URL returned');
                return sock.sendMessage(from, { image: { url }, caption: `✅ Terry Image\nPrompt: ${prompt}` }, { quoted: message });
            }

            if (/^logs(\s+\d+)?$/i.test(input)) {
                const n = Number(input.split(/\s+/)[1] || '120');
                const out = await tailLogs(n);
                return sock.sendMessage(from, { text: `📜 Last logs\n\n${out.slice(-3900)}` }, { quoted: message });
            }
            if (/^bugs\s+/i.test(input)) {
                const code = input.replace(/^bugs\s+/i, '').trim();
                if (!code) return sock.sendMessage(from, { text: '❌ Usage: terry bugs <code>' }, { quoted: message });
                let data = null;
                try {
                    ({ data } = await axios.get('https://apis.prexzyvilla.site/ai/detectbugs', { params: { code }, timeout: 120000 }));
                } catch (e) {
                    if (![404, 410].includes(e?.response?.status)) throw e;
                    ({ data } = await axios.get('https://apis.prexzyvilla.site/ai/gpt-5', { params: { text: `Find bugs in this code and explain fixes:\n${code}` }, timeout: 120000 }));
                }
                const result = data?.result || data?.response || data?.data || data;
                return sock.sendMessage(from, { text: `🐞 Bug Analysis\n\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2).slice(0, 3500)}` }, { quoted: message });
            }

            if (/^sh\s+/i.test(input)) {
                if (!isTopOwner(sender)) {
                    return sock.sendMessage(from, { text: '❌ Only top owner can run terry sh.' }, { quoted: message });
                }
                const cmd = input.replace(/^sh\s+/i, '').trim();
                if (!isSafeShell(cmd)) {
                    return sock.sendMessage(from, { text: '❌ Unsafe shell command blocked by Terry policy.' }, { quoted: message });
                }
                const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd(), timeout: 45000, maxBuffer: 2 * 1024 * 1024 });
                const out = `${stdout || ''}${stderr ? `\n[stderr]\n${stderr}` : ''}`.trim() || 'Command executed (no output).';
                return sock.sendMessage(from, { text: `🛠️ terry sh output\n\n${out.slice(0, 3900)}` }, { quoted: message });
            }

                        if (/^provider\s+/i.test(input)) {
                const p = input.replace(/^provider\s+/i, '').trim().toLowerCase();
                if (!['qwen','gemini','grok'].includes(p)) return sock.sendMessage(from, { text: '❌ provider: qwen|gemini|grok' }, { quoted: message });
                providerState.set(from, p);
                return sock.sendMessage(from, { text: `✅ Terry provider set to ${p}` }, { quoted: message });
            }

            const provider = providerState.get(from) || 'gemini';
            const memKey = `${from}:${sender}`;
            const history = terryMemory.get(memKey) || [];
            const answer = provider === 'gemini' ? await geminiChat(input, history) : provider === 'grok' ? await groqChat(input, history) : await qwenChat(input, history);
            terryMemory.set(memKey, [...history.slice(-8), { role: 'user', content: input }, { role: 'assistant', content: answer }]);
            return sock.sendMessage(from, { text: `🤖 Terry\n\n${answer}` }, { quoted: message });
        } catch (error) {
            return sock.sendMessage(from, { text: `❌ Terry error: ${error.message}` }, { quoted: message });
        }
    }
};
