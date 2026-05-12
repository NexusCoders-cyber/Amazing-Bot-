import axios from 'axios';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const execAsync = promisify(exec);
const DEE_PHOTOS = [
  'https://i.ibb.co/YTBPq5vj/fd53ebefdcd3.jpg','https://i.ibb.co/NnL8S4wh/a66e525b87e6.jpg','https://i.ibb.co/sddkLcYb/6d380869a836.jpg'
];
const MODEL_CHOICES = { qwen: process.env.DEE_QWEN_MODEL || 'qwen/qwen2.5-vl-72b-instruct:free', gemini: process.env.DEE_GEMINI_MODEL || 'google/gemini-2.5-flash', groq: process.env.DEE_GROQ_MODEL || 'meta-llama/llama-3.3-70b-instruct' };
const state = global.deeState || (global.deeState = { enabledChats: new Set(), memory: new Map(), models: new Map(), voiceMode: new Set() });
const ASSEMBLY_API_KEY = process.env.ASSEMBLYAI_API_KEY || '22b87c4a57e04c73914de4b75edd05c1';

const getActiveModel = (chatId) => MODEL_CHOICES[String(state.models.get(chatId) || 'gemini').toLowerCase()] ? String(state.models.get(chatId) || 'gemini').toLowerCase() : 'gemini';
const isAudioMsg = (m) => !!(m?.message?.audioMessage || m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage);

async function sttFromMessage(sock, message) {
  const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const target = quoted?.audioMessage ? { message: quoted } : message;
  const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
  const up = await axios.post('https://api.assemblyai.com/v2/upload', buffer, { headers: { authorization: ASSEMBLY_API_KEY, 'content-type': 'application/octet-stream' } });
  const create = await axios.post('https://api.assemblyai.com/v2/transcript', { audio_url: up.data.upload_url, language_detection: true }, { headers: { authorization: ASSEMBLY_API_KEY } });
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const check = await axios.get(`https://api.assemblyai.com/v2/transcript/${create.data.id}`, { headers: { authorization: ASSEMBLY_API_KEY } });
    if (check.data.status === 'completed') return check.data.text || '';
    if (check.data.status === 'error') throw new Error(check.data.error || 'Transcribe failed');
  }
  throw new Error('Transcribe timeout');
}

async function ttsOpus(text) {
  const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Joanna&text=${encodeURIComponent(String(text).slice(0, 450))}`;
  const mp3 = await axios.get(ttsUrl, { responseType: 'arraybuffer', timeout: 40000 });
  const tmp = `/tmp/dee_${Date.now()}`;
  const inMp3 = `${tmp}.mp3`; const outOgg = `${tmp}.ogg`;
  fs.writeFileSync(inMp3, Buffer.from(mp3.data));
  await execAsync(`ffmpeg -y -i ${inMp3} -c:a libopus -b:a 48k -vbr on ${outOgg}`);
  const ogg = fs.readFileSync(outOgg);
  fs.unlinkSync(inMp3); fs.unlinkSync(outOgg);
  return ogg;
}


async function callDeeModel(selected, messages) {
  if (selected === 'groq') {
    if (!process.env.GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY');
    const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', { model: MODEL_CHOICES.groq, messages }, { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 90000 });
    return data?.choices?.[0]?.message?.content?.trim();
  }
  if (selected === 'gemini' && process.env.GEMINI_API_KEY) {
    const model = process.env.DEE_GEMINI_MODEL || 'gemini-2.5-flash';
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, { contents: [{ parts: [{ text: prompt }] }] }, { timeout: 90000 });
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  }
  const key = process.env.OPENROUTER_API_KEY || process.env.DEE_OPENROUTER_API_KEY;
  if (!key) throw new Error('Missing Authentication header: set OPENROUTER_API_KEY / GEMINI_API_KEY / GROQ_API_KEY');
  const { data } = await axios.post('https://openrouter.ai/api/v1/chat/completions', { model: MODEL_CHOICES[selected], messages }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 90000 });
  return data?.choices?.[0]?.message?.content?.trim();
}
export default {
  name: 'dee', aliases: ['mrsdee', 'babe', 'bestie'], category: 'ai', usage: 'dee on/off | dee vn on/off | dee model <qwen|gemini|groq> | dee <message>', cooldown: 3,
  async execute({ sock, message, from, args, sender, prefix = '.' }) {
    let text = args.join(' ').trim();
    const cmd = text.toLowerCase();
    if (cmd === 'on') { state.enabledChats.add(from); return sock.sendMessage(from, { text: '✅ Dee ON' }, { quoted: message }); }
    if (cmd === 'off') { state.enabledChats.delete(from); return sock.sendMessage(from, { text: '✅ Dee OFF' }, { quoted: message }); }
    if (cmd === 'vn on') { state.voiceMode.add(`${from}:${sender}`); return sock.sendMessage(from, { text: '✅ Dee voice-reply ON for you.' }, { quoted: message }); }
    if (cmd === 'vn off') { state.voiceMode.delete(`${from}:${sender}`); return sock.sendMessage(from, { text: '✅ Dee voice-reply OFF for you.' }, { quoted: message }); }
    if (cmd === 'help' || !cmd) return sock.sendMessage(from, { text: `Use: ${prefix}dee on/off\n${prefix}dee vn on/off\n${prefix}dee model gemini|groq|qwen\n${prefix}dee <chat>` }, { quoted: message });
    if (cmd.startsWith('model ')) { const want = cmd.split(/\s+/)[1]; if (!MODEL_CHOICES[want]) return sock.sendMessage(from, { text: '❌ model: qwen|gemini|groq' }, { quoted: message }); state.models.set(from, want); return sock.sendMessage(from, { text: `✅ Dee model ${want}` }, { quoted: message }); }
    if (!state.enabledChats.has(from)) return sock.sendMessage(from, { text: '⚠️ Dee is off. Use .dee on' }, { quoted: message });

    if (isAudioMsg(message)) {
      await sock.sendMessage(from, { text: '⏳ Dee is transcribing your voice note...' }, { quoted: message });
      text = await sttFromMessage(sock, message);
      if (!text) return sock.sendMessage(from, { text: '❌ No speech detected.' }, { quoted: message });
    }

    if (/(photo|picture|pic|selfie|view ?once)/i.test(text)) return sock.sendMessage(from, { image: { url: DEE_PHOTOS[Math.floor(Math.random() * DEE_PHOTOS.length)] }, caption: 'That is me, Dee 💖', viewOnce: true }, { quoted: message });

    const key = `${from}:${sender}`; const prev = state.memory.get(key) || [];
    const selected = getActiveModel(from);
    const messages = [{ role: 'system', content: 'You are Dee. Be warm and concise. Keep context and handle switching between chat/image/song requests naturally.' }, ...prev.slice(-8).map((x) => ({ role: x.role, content: x.content })), { role: 'user', content: text }];

    let reply = '';
    try {
      reply = (await callDeeModel(selected, messages)) || 'I am here with you 💕';
    } catch (e) {
      reply = `❌ Dee API failed: ${e.response?.data?.error?.message || e.message}`;
    }

    state.memory.set(key, [...prev.slice(-12), { role: 'user', content: text }, { role: 'assistant', content: reply }]);
    if (state.voiceMode.has(key) || isAudioMsg(message)) {
      const ogg = await ttsOpus(reply);
      return sock.sendMessage(from, { audio: ogg, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: message });
    }
    return sock.sendMessage(from, { text: reply }, { quoted: message });
  }
};
