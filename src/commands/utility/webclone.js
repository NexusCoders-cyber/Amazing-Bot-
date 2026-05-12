import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_URL = 'https://apis.malvryx.dev/api/tools/web-cloner';
const API_BASE = 'https://apis.malvryx.dev';
const TMP_DIR = path.resolve(process.cwd(), 'tmp');

const FONTS_FILE = path.resolve(process.cwd(), 'fonts/fontmap.json');
const FONT_ID = 'small_caps';
const NEWSLETTER_JID = '120363421055682094@newsletter';
const NEWSLETTER_NAME = "DEVIL'S UPDATE CHANNEL";
const NEWSLETTER_MSG_ID = 281;

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function loadFont(fontId = FONT_ID) {
  try {
    if (!fs.existsSync(FONTS_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(FONTS_FILE, 'utf8'));
    return data?.fonts?.find((f) => f.id === fontId)?.map || null;
  } catch {
    return null;
  }
}

function sf(text, fontMap) {
  if (!fontMap) return String(text);
  return String(text).split('').map((c) => fontMap[c] || fontMap[c.toUpperCase()] || c).join('');
}

function msgCtx(styledNewsletterName) {
  return {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: NEWSLETTER_JID,
      serverMessageId: NEWSLETTER_MSG_ID,
      newsletterName: styledNewsletterName,
    },
  };
}

function formatBytes(bytes = 0) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  name: 'webclone',
  aliases: ['cloneweb', 'siteclone'],
  category: 'utility',
  description: 'Clone website to downloadable ZIP (via ilom).',
  usage: 'webclone <url>',
  cooldown: 8,
  args: true,

  async execute({ sock, message, args, from }) {
    let tmpZip = null;
    const fontMap = loadFont();
    const S = (t) => sf(t, fontMap);
    const styled = S(NEWSLETTER_NAME);

    const sendText = async (text) => sock.sendMessage(from, { text, contextInfo: msgCtx(styled) }, { quoted: message });

    try {
      const url = (args || []).join(' ').trim();
      if (!url) {
        await sendText(`*${S('WEBCLONE')}*\n─────────────────────\n🔹 *${S('Usage')}* : \`.webclone <url>\`\n─────────────────────\n> ${S('Created by ilom')}`);
        return;
      }

      const apiKey = process.env.ILOM_API_KEY || null;
      if (!apiKey) {
        await sendText(`*${S('WEBCLONE CONFIG ERROR')}*\n─────────────────────\n🔹 *${S('Missing')}* : \`ILOM_API_KEY\`\n🔹 *${S('Status')}* : _${S('Not set in vars/env')}_\n─────────────────────\n> ${S('Created by ilom')}`);
        return;
      }

      const { data: startData } = await axios.post(API_URL, { url }, {
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        timeout: 120000,
      });

      const taskId = startData?.result?.taskId;
      const pollPath = startData?.result?.pollUrl;
      if (!taskId || !pollPath) throw new Error('No taskId/pollUrl in clone response');

      const pollUrl = `${API_BASE}${pollPath}`;

      await sendText(`*${S('WEBCLONE')}*\n─────────────────────\n🔹 *${S('Status')}* : _${S('Cloning started')}_\n🔹 *${S('URL')}* : _${url}_\n🔹 *${S('Task ID')}* : \`${taskId}\`\n─────────────────────\n> ${S('Created by ilom')}`);

      let result = null;
      const maxPolls = 60;
      for (let i = 0; i < maxPolls; i += 1) {
        await sleep(10000);
        const { data: pollData } = await axios.get(pollUrl, {
          headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
          timeout: 60000,
        });

        const status = String(pollData?.result?.status || '').toLowerCase();
        if (status === 'completed') {
          result = pollData.result;
          break;
        }
        if (status === 'failed' || status === 'error') throw new Error('Clone job failed on server');
      }

      if (!result?.zipUrl) throw new Error('Clone did not complete or no ZIP produced');

      const zipName = `webclone_${result.taskId || Date.now()}.zip`;
      tmpZip = path.join(TMP_DIR, zipName);

      const zipRes = await axios.get(result.zipUrl, { responseType: 'arraybuffer', timeout: 120000 });
      const zipBuffer = Buffer.from(zipRes.data);
      fs.writeFileSync(tmpZip, zipBuffer);

      const meta = result.meta || {};
      const details =
        `*${S('WEBCLONE — SITE CLONED')}*\n` +
        '─────────────────────\n' +
        `🔹 *${S('URL')}* : _${result.url || url}_\n` +
        (meta.title ? `🔹 *${S('Title')}* : _${meta.title}_\n` : '') +
        (meta.description ? `🔹 *${S('Desc')}* : _${meta.description}_\n` : '') +
        (typeof result.sizeBytes === 'number' ? `🔹 *${S('Size')}* : \`${formatBytes(result.sizeBytes)}\`\n` : '') +
        (result.assets ? `🔹 *${S('Assets')}* : css:${result.assets.css || 0} js:${result.assets.js || 0} img:${result.assets.images || 0}\n` : '') +
        (result.method ? `🔹 *${S('Method')}* : \`${result.method}\`\n` : '') +
        '─────────────────────\n' +
        `> ${S('Created by ilom')}`;

      await sendText(details);

      await sock.sendMessage(from, {
        document: fs.readFileSync(tmpZip),
        fileName: zipName,
        mimetype: 'application/zip',
        caption: `*${S('WEB CLONE ZIP READY')}*`,
        contextInfo: msgCtx(styled),
      }, { quoted: message });
    } catch (e) {
      await sendText(`*❌ ${S('WEBCLONE ERROR')}*\n─────────────────────\n\`\`\`${e.message}\`\`\`\n─────────────────────\n> ${S('Created by ilom')}`);
    } finally {
      if (tmpZip && fs.existsSync(tmpZip)) {
        try { fs.unlinkSync(tmpZip); } catch {}
      }
    }
  },
};
