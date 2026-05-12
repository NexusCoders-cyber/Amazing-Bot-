import axios from 'axios';
import fs from 'fs';
import { exec } from 'child_process';
import logger from '../../utils/logger.js';

const BASE_URL = 'https://apis.prexzyvilla.site/nsfw';

async function fetchNsfwMedia(endpoint) {
  const response = await axios.get(`${BASE_URL}/${endpoint}`, { responseType: 'arraybuffer', timeout: 30000 });
  return { buffer: Buffer.from(response.data), contentType: response.headers['content-type'] || '' };
}

async function gifToMp4(gifBuffer, tag) {
  const tmp = `/tmp/nsfw_${tag}_${Date.now()}`;
  const gifPath = `${tmp}.gif`; const mp4Path = `${tmp}.mp4`;
  fs.writeFileSync(gifPath, gifBuffer);
  await new Promise((resolve, reject) => exec(`ffmpeg -y -i ${gifPath} -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -movflags faststart -pix_fmt yuv420p ${mp4Path}`, (err) => err ? reject(err) : resolve()));
  const mp4 = fs.readFileSync(mp4Path);
  fs.unlinkSync(gifPath); fs.unlinkSync(mp4Path);
  return mp4;
}

async function sendNsfwMedia(sock, message, endpoint, label) {
  const jid = message.key.remoteJid;
  await sock.sendMessage(jid, { react: { text: '🔞', key: message.key } });
  try {
    const { buffer, contentType } = await fetchNsfwMedia(endpoint);
    if (contentType.includes('application/json')) {
      const err = JSON.parse(buffer.toString('utf8'));
      throw new Error(err.message || err.error || 'API returned error');
    }
    const caption = `🔞 *${label}*`;
    if (contentType.includes('gif')) {
      const mp4 = await gifToMp4(buffer, endpoint);
      await sock.sendMessage(jid, { video: mp4, gifPlayback: true, caption }, { quoted: message });
    } else if (contentType.includes('video')) {
      await sock.sendMessage(jid, { video: buffer, caption }, { quoted: message });
    } else {
      await sock.sendMessage(jid, { image: buffer, caption }, { quoted: message });
    }
    await sock.sendMessage(jid, { react: { text: '✅', key: message.key } });
  } catch (error) {
    logger.error(`[NSFW] ${endpoint}:`, error.message);
    await sock.sendMessage(jid, { text: `❌ *${label} failed*\nReason: ${error.message}` }, { quoted: message });
  }
}

const aliases = ['ass','sixtynine','pussy','dick','anal','boobs','bdsm','black','bottomless','collared','cum','cumsluts','dp','dom','extreme','feet','finger','fuck','futa','gay','gif','group','hentai','kiss','lick','pegged','phgif','puffies','real','suck','tattoo','tiny','toys'];

export default {
  name: 'nsfw',
  aliases: ['text2nsfw', ...aliases],
  category: 'ai',
  description: 'NSFW media command',
  usage: 'nsfw <category>',
  cooldown: 5,
  async execute({ sock, message, args, command }) {
    const cmdName = typeof command === 'string' ? command.toLowerCase() : '';
    const requested = (cmdName && cmdName !== 'nsfw' && cmdName !== 'text2nsfw') ? cmdName : String(args[0] || 'hentai').toLowerCase();
    await sendNsfwMedia(sock, message, requested, requested.toUpperCase());
  }
};
