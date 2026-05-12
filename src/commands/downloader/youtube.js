import axios from 'axios';
import yts from 'yt-search';

const YOUTUBE_URL_RE = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i;

function senderJid(message) {
  return message?.key?.participant || message?.key?.remoteJid || '';
}
function bareJid(jid = '') {
  return String(jid).split(':')[0];
}

async function downloadAndSend(urlOrQuery, type, sock, chatId, quotedMessage) {
  const apiUrl = `https://apis.davidcyril.name.ng/play?query=${encodeURIComponent(urlOrQuery)}`;
  const { data } = await axios.get(apiUrl, { timeout: 45000 });
  if (!data?.status || !data?.result) throw new Error('No media result from API.');
  if (String(data?.creator || '').toLowerCase() !== 'david cyril') throw new Error('Untrusted provider response.');
  const result = data.result;
  const mediaUrl = type === 'audio' ? result.download_url : result.video_url;
  if (!mediaUrl) throw new Error('Download link missing from provider.');

  if (type === 'audio') {
    return sock.sendMessage(chatId, {
      audio: { url: mediaUrl },
      mimetype: 'audio/mpeg',
      fileName: `${(result.title || 'song').slice(0,60)}.mp3`,
      ptt: false
    }, { quoted: quotedMessage });
  }

  return sock.sendMessage(chatId, {
    video: { url: mediaUrl },
    mimetype: 'video/mp4',
    caption: `🎬 ${result.title || 'Video'}\n⏱ ${result.duration || 'N/A'}\n👀 ${result.views || 0}`
  }, { quoted: quotedMessage });
}

export default {
  name: 'ytb',
  aliases: ['youtube', 'y', 'yt'],
  category: 'downloader',
  description: 'Download YouTube audio/video by search or URL',
  usage: 'ytb -a|-v <query or url>',
  cooldown: 10,
  permissions: ['user'],

  async execute({ sock, message, args, from, sender }) {
    if (!args.length) {
      return sock.sendMessage(from, {
        text: 'Please specify type and query.\nUsage:\nytb -a <song name/url>\nytb -v <video name/url>'
      }, { quoted: message });
    }

    let type = 'video';
    if (['audio', '-a'].includes(args[0].toLowerCase())) {
      type = 'audio';
      args.shift();
    } else if (['video', '-v'].includes(args[0].toLowerCase())) {
      type = 'video';
      args.shift();
    } else if (!String(args[0] || '').startsWith('http')) {
      return sock.sendMessage(from, {
        text: '⚠️ Please use -a for audio or -v for video first.'
      }, { quoted: message });
    }

    const query = args.join(' ').trim();
    if (!query) {
      return sock.sendMessage(from, { text: 'Please provide a URL or search term.' }, { quoted: message });
    }

    if (YOUTUBE_URL_RE.test(query)) {
      try {
        await downloadAndSend(query, type, sock, from, message);
      } catch (error) {
        await sock.sendMessage(from, { text: `❌ Error: ${error.message}` }, { quoted: message });
      }
      return;
    }

    try {
      await sock.sendMessage(from, { text: `🔍 Searching YouTube for: *${query}*...` }, { quoted: message });
      const search = await yts(query);
      const videos = (search?.videos || []).slice(0, 5);

      if (!videos.length) {
        return sock.sendMessage(from, { text: `No results found for "${query}".` }, { quoted: message });
      }

      let listMsg = `🎵 *YouTube ${type === 'audio' ? 'Audio' : 'Video'} Results*\n\n`;
      videos.forEach((v, i) => {
        listMsg += `*${i + 1}.* ${v.title}\n`;
        listMsg += `   ⏱️ ${v.timestamp} | 📺 ${v.author?.name || 'Unknown'}\n`;
      });
      listMsg += '\n_Reply with 1-5 to download._';

      const sentMsg = await sock.sendMessage(from, { text: listMsg }, { quoted: message });

      if (!global.replyHandlers) global.replyHandlers = {};
      global.replyHandlers[sentMsg.key.id] = {
        command: 'ytb',
        handler: async (replyText, replyMessage) => {
          const replySender = bareJid(senderJid(replyMessage));
          if (replySender !== bareJid(sender)) return;

          const choice = parseInt(String(replyText || '').trim(), 10);
          if (Number.isNaN(choice) || choice < 1 || choice > videos.length) {
            return sock.sendMessage(from, { text: '❌ Invalid choice.' }, { quoted: replyMessage });
          }

          const selected = videos[choice - 1];
          try {
            await downloadAndSend(selected.url, type, sock, from, replyMessage);
          } catch (error) {
            await sock.sendMessage(from, { text: `❌ Error: ${error.message}` }, { quoted: replyMessage });
          } finally {
            delete global.replyHandlers?.[sentMsg.key.id];
          }
        }
      };
    } catch {
      await sock.sendMessage(from, { text: '❌ Search failed.' }, { quoted: message });
    }
  }
};
