import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const FONTS_FILE = path.resolve(process.cwd(), 'fonts/fontmap.json');
const FONT_ID = 'small_caps';
const UPLOAD_URL = 'https://tmp.malvryx.dev/upload';

function loadFont(fontId = FONT_ID) {
  try {
    if (!fs.existsSync(FONTS_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(FONTS_FILE, 'utf8'));
    if (!data || !Array.isArray(data.fonts)) return null;
    return data.fonts.find((f) => f.id === fontId)?.map || null;
  } catch {
    return null;
  }
}

function sf(text, fontMap) {
  if (!fontMap) return String(text);
  return String(text).split('').map((c) => fontMap[c] || fontMap[c.toUpperCase()] || c).join('');
}

function shuffle(arr) {
  let m = arr.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
}

function truncPrompt(txt, lim = 320) {
  const normalized = String(txt || '').replace(/\s+/g, ' ').trim();
  return normalized.length > lim ? `${normalized.slice(0, lim - 3)}...` : normalized;
}

function extractQuoted(message) {
  const ctx = message?.message?.extendedTextMessage?.contextInfo;
  return {
    quotedMessage: ctx?.quotedMessage || null,
    quotedKey: {
      remoteJid: message.key?.remoteJid,
      id: ctx?.stanzaId,
      participant: ctx?.participant
    }
  };
}

async function getImageSource(message) {
  if (message.message?.imageMessage) {
    return {
      imageMessage: message.message.imageMessage,
      key: message.key,
      caption: message.message.imageMessage.caption || ''
    };
  }

  const { quotedMessage, quotedKey } = extractQuoted(message);
  if (quotedMessage?.imageMessage) {
    return {
      imageMessage: quotedMessage.imageMessage,
      key: quotedKey,
      caption: quotedMessage.imageMessage.caption || ''
    };
  }

  return null;
}

export default {
  name: 'upload2',
  aliases: ['qimgedit', 'qwenimg', 'imgeditq'],
  category: 'utility',
  description: 'Edit an image with Qwen by sending caption prompt or replying to an image.',
  usage: 'upload2 <prompt> (caption on image or reply to image)',
  cooldown: 8,

  async execute({ sock, message, args, from }) {
    const fontMap = loadFont();
    const S = (t) => sf(t, fontMap);
    const sendText = async (text) => sock.sendMessage(from, { text }, { quoted: message });

    try {
      const keyRaw = process.env.QIMGEDIT_KEYS || '';
      const keys = keyRaw.split(',').map((k) => k.trim()).filter((k) => k.length > 20);
      if (!keys.length) {
        await sendText(`*${S('QIMGEDIT')}*\n─────────────────────\n🔹 *${S('Key')}* : _No Qwen API keys set (QIMGEDIT_KEYS)_`);
        return;
      }

      const src = await getImageSource(message);
      if (!src) {
        await sendText(`*${S('QIMGEDIT')}*\n─────────────────────\n🔹 *${S('Error')}* : _Send as image caption or reply to an image_`);
        return;
      }

      let prompt = (args || []).join(' ').trim();
      if (!prompt && src.caption) prompt = src.caption.trim();
      if (!prompt) {
        await sendText(`*${S('QIMGEDIT')}*\n─────────────────────\n🔹 *${S('Error')}* : _Please provide a prompt_`);
        return;
      }

      const buffer = await downloadMediaMessage({ key: src.key, message: { imageMessage: src.imageMessage } }, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
      if (!buffer) throw new Error('Failed to download image.');

      await sendText(`*${S('QIMGEDIT')}*\n─────────────────────\n🔹 *${S('Status')}* : _Uploading to CDN..._\n🔹 *${S('Prompt')}* : _${S(prompt)}_`);

      const form = new FormData();
      form.append('file', buffer, { filename: 'image.jpg' });

      const cdnT0 = Date.now();
      const cdnRes = await axios.post(UPLOAD_URL, form, {
        headers: {
          ...form.getHeaders(),
          ...(process.env.MALVRYX_TMP_KEY ? { 'X-API-Key': process.env.MALVRYX_TMP_KEY } : {}),
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 60000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true
      });

      if (cdnRes.status < 200 || cdnRes.status >= 300 || !cdnRes.data?.success) {
        throw new Error(`Upload to CDN failed: ${cdnRes.data?.message || `HTTP ${cdnRes.status}`}`);
      }

      const imgUrl = cdnRes.data.cdnUrl || cdnRes.data.directUrl;
      if (!imgUrl) throw new Error('CDN did not return image URL.');
      const cdnT1 = Date.now();

      let qwen = null;
      let imgRes = null;
      let lastErr = null;
      const qwenT0 = Date.now();

      for (const key of shuffle([...keys])) {
        try {
          const apiRes = await axios.post('https://qwen.aikit.club/v1/images/edits', { image: imgUrl, prompt }, {
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            timeout: 180000,
            validateStatus: () => true
          });

          if ((apiRes.status === 401 || apiRes.status === 429) && apiRes.data?.message) {
            lastErr = new Error(apiRes.data.message);
            continue;
          }

          if (apiRes.status < 200 || apiRes.status >= 300) {
            throw new Error(`Qwen API HTTP${apiRes.status}: ${apiRes.data?.message || 'Unknown error'}`);
          }

          if (apiRes.data?.data?.[0]?.url) {
            const out = await axios.get(apiRes.data.data[0].url, { responseType: 'arraybuffer', validateStatus: () => true });
            if (out.status >= 200 && out.status < 300 && out.data) {
              qwen = apiRes.data;
              imgRes = out;
              break;
            }
          }
        } catch (e) {
          lastErr = e;
        }
      }

      const qwenT1 = Date.now();
      if (!qwen?.data?.[0]?.url || !imgRes?.data) {
        throw new Error(`All keys failed. Last error: ${lastErr?.message || 'unknown'}`);
      }

      const revisedPrompt = truncPrompt(qwen.data[0]?.revised_prompt || prompt, 320);

      await sock.sendMessage(from, {
        image: Buffer.from(imgRes.data),
        caption:
          `*${S('QIMGEDIT RESULT')}*\n` +
          '─────────────────────\n' +
          `🔹 *${S('Prompt')}* : _${revisedPrompt}_\n` +
          `🔹 *${S('Upload')}* : \`${((cdnT1 - cdnT0) / 1000).toFixed(2)}s\`\n` +
          `🔹 *${S('AI Edit')}* : \`${((qwenT1 - qwenT0) / 1000).toFixed(2)}s\``
      }, { quoted: message });
    } catch (e) {
      await sendText(`*❌ ${S('QIMGEDIT error')}*\n\`\`\`${e.message}\`\`\``);
    }
  }
};
