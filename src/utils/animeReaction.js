import axios from 'axios';
import fs from 'fs';
import { exec } from 'child_process';

async function gifToMp4(buffer, tag) {
  const tmp = `/tmp/anime_${tag}_${Date.now()}`;
  const gifPath = `${tmp}.gif`; const mp4Path = `${tmp}.mp4`;
  fs.writeFileSync(gifPath, buffer);
  await new Promise((resolve, reject) => exec(`ffmpeg -y -i ${gifPath} -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -movflags faststart -pix_fmt yuv420p ${mp4Path}`, (err) => err ? reject(err) : resolve()));
  const out = fs.readFileSync(mp4Path);
  fs.unlinkSync(gifPath); fs.unlinkSync(mp4Path);
  return out;
}

async function fetchMedia(endpoint) {
  const apis = [
    `https://api.waifu.pics/sfw/${endpoint}`,
    `https://nekos.best/api/v2/${endpoint}`,
    `https://api.otakugifs.xyz/gif?reaction=${endpoint}`
  ];
  for (const url of apis) {
    try {
      const { data } = await axios.get(url, { timeout: 9000 });
      const mediaUrl = data?.url || data?.results?.[0]?.url;
      if (mediaUrl) {
        const media = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000 });
        return { buffer: Buffer.from(media.data), contentType: media.headers['content-type'] || '' };
      }
    } catch {}
  }
  return null;
}

export function makeAnimeReactionCommand({ name, endpoint, verb, selfAction = false }) {
  return {
    name,
    category: 'fun',
    description: 'Anime reaction command',
    usage: `${name} [@user]`,
    cooldown: 3,
    async execute({ sock, message, from }) {
      const payload = await fetchMedia(endpoint);
      if (!payload) return sock.sendMessage(from, { text: '❌ All anime gif APIs are down rn :(' }, { quoted: message });
      const sender = message.key.participant || message.key.remoteJid;
      const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      let caption = `@${sender.split('@')[0]} ${verb}`;
      if (!selfAction) caption += mentions.length ? ` ${mentions.map((jid) => `@${jid.split('@')[0]}`).join(', ')}` : ' themselves';
      const allMentions = [sender, ...mentions];
      const { buffer, contentType } = payload;
      if (contentType.includes('gif')) {
        const mp4 = await gifToMp4(buffer, endpoint);
        return sock.sendMessage(from, { video: mp4, gifPlayback: true, caption, mentions: allMentions }, { quoted: message });
      }
      if (contentType.includes('video')) return sock.sendMessage(from, { video: buffer, caption, mentions: allMentions }, { quoted: message });
      return sock.sendMessage(from, { image: buffer, caption, mentions: allMentions }, { quoted: message });
    }
  };
}
