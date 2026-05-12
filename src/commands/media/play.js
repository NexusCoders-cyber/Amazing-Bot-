import yts from 'yt-search';
import fs from 'fs-extra';
import path from 'path';

// Try dynamic import of distube ytdl-core
async function getYtdl() {
  try {
    return await import('@distube/ytdl-core');
  } catch {
    try {
      return await import('ytdl-core');
    } catch {
      return null;
    }
  }
}

export default {
  name: 'play',
  aliases: ['ytmp3', 'song', 'ytvideo', 'ytmp4'],
  category: 'media',
  description: 'Search YouTube and send audio or video',
  usage: 'play <song name> or play --video <name>',
  cooldown: 5,

  async execute({ sock, message, args, from }) {
    if (!args.length) {
      return sock.sendMessage(from, {
        text: `🎵 *Play*\n\nUsage:\nplay <song name> — send audio\nplay --video <name> — send video\nplay --audio <name> — force audio\n\nReply to someone with play <name> to send it to them.`
      }, { quoted: message });
    }

    // Detect mode
    let format = 'audio';
    let query = args.join(' ').trim();
    const first = args[0]?.toLowerCase();
    if (first === '--video' || first === '-v') {
      format = 'video';
      query = args.slice(1).join(' ').trim();
    } else if (first === '--audio' || first === '-a') {
      format = 'audio';
      query = args.slice(1).join(' ').trim();
    }

    if (!query) {
      return sock.sendMessage(from, { text: '❌ Give a song name or video title.' }, { quoted: message });
    }

    // Check if user replied to someone — send to that person instead
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    let targetJid = from;
    if (ctx?.participant && from.endsWith('@g.us')) {
      targetJid = ctx.participant;
    }

    try {
      await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });

      // Search
      const search = await yts(query);
      if (!search?.videos?.length) {
        await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        return sock.sendMessage(from, { text: `❌ No results for "${query}".` }, { quoted: message });
      }

      const video = search.videos[0];
      const title = video.title || 'Unknown';
      const duration = video.timestamp || 'N/A';
      const views = video.views?.toLocaleString() || 'N/A';
      const thumbnail = video.thumbnail || '';
      const videoUrl = video.url;

      await sock.sendMessage(from, {
        text: `📥 Found: *${title}*\n⏱️ ${duration} • 👁️ ${views}\n⬇️ Downloading ${format}...`
      }, { quoted: message });

      // Try ytdl-core first
      const ytdl = await getYtdl();
      if (ytdl && ytdl.default?.validateURL) {
        try {
          const yt = ytdl.default || ytdl;
          const info = await yt.getInfo(videoUrl);
          const tempDir = path.join(process.cwd(), 'temp', 'downloads');
          await fs.ensureDir(tempDir);

          if (format === 'audio') {
            const stream = yt(videoUrl, {
              filter: 'audioonly',
              quality: 'highestaudio'
            });
            const audioPath = path.join(tempDir, `play_${Date.now()}.mp3`);
            const writeStream = fs.createWriteStream(audioPath);
            stream.pipe(writeStream);
            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
              stream.on('error', reject);
            });
            const audioBuffer = await fs.readFile(audioPath);
            await fs.remove(audioPath).catch(() => {});

            await sock.sendMessage(from, { react: { text: '🎧', key: message.key } });
            await sock.sendMessage(targetJid, {
              audio: audioBuffer,
              mimetype: 'audio/mpeg',
              fileName: `${title.replace(/[\\/:*?"<>|]/g, '').slice(0, 120)}.mp3`,
              contextInfo: {
                externalAdReply: {
                  thumbnailUrl: thumbnail,
                  title: title.slice(0, 100),
                  body: `👁️ ${views} views • ⏱️ ${duration}`,
                  sourceUrl: videoUrl,
                  renderLargerThumbnail: true,
                  mediaType: 1
                }
              }
            }, targetJid === from ? { quoted: message } : undefined);

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
            if (targetJid !== from) {
              await sock.sendMessage(from, { text: `✅ Sent "${title}" to the replied user.` }, { quoted: message });
            }
            return;
          } else {
            // Video
            const stream = yt(videoUrl, {
              filter: f => f.container === 'mp4' && f.hasVideo && f.hasAudio,
              quality: 'lowest' // smallest file for WhatsApp
            });
            const videoPath = path.join(tempDir, `play_vid_${Date.now()}.mp4`);
            const writeStream = fs.createWriteStream(videoPath);
            stream.pipe(writeStream);
            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
              stream.on('error', reject);
            });
            const videoBuffer = await fs.readFile(videoPath);
            await fs.remove(videoPath).catch(() => {});

            await sock.sendMessage(from, { react: { text: '🎬', key: message.key } });
            await sock.sendMessage(targetJid, {
              video: videoBuffer,
              mimetype: 'video/mp4',
              caption: `${title}\n👁️ ${views} • ⏱️ ${duration}\n${videoUrl}`,
              contextInfo: {
                externalAdReply: {
                  thumbnailUrl: thumbnail,
                  title: title.slice(0, 100),
                  body: `👁️ ${views} views • ⏱️ ${duration}`,
                  sourceUrl: videoUrl,
                  renderLargerThumbnail: true,
                  mediaType: 1
                }
              }
            }, targetJid === from ? { quoted: message } : undefined);

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
            if (targetJid !== from) {
              await sock.sendMessage(from, { text: `✅ Sent "${title}" to the replied user.` }, { quoted: message });
            }
            return;
          }
        } catch (ytdlErr) {
          console.error('ytdl-core failed, falling back to API:', ytdlErr.message);
        }
      }

      // Fallback: use external API
      await sock.sendMessage(from, { text: '🔄 Using fallback API...' }, { quoted: message });
      const axios = (await import('axios')).default;
      const apiUrl = format === 'video'
        ? `https://api.ootaizumi.web.id/downloader/youtube?url=${encodeURIComponent(videoUrl)}&format=mp4`
        : `https://api.ootaizumi.web.id/downloader/youtube?url=${encodeURIComponent(videoUrl)}&format=mp3`;

      const apiRes = await axios.get(apiUrl, { timeout: 60000 });
      const dlUrl = apiRes.data?.result?.download || apiRes.data?.download || apiRes.data?.url;
      if (!dlUrl) throw new Error('API did not return download URL');

      const mediaRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 180000 });
      const mediaBuffer = Buffer.from(mediaRes.data);

      await sock.sendMessage(from, { react: { text: '🎧', key: message.key } });

      const msgOpts = format === 'video'
        ? { video: mediaBuffer, mimetype: 'video/mp4', caption: `${title}\n${videoUrl}` }
        : {
            audio: mediaBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${title.replace(/[\\/:*?"<>|]/g, '').slice(0, 120)}.mp3`,
            contextInfo: {
              externalAdReply: {
                thumbnailUrl: thumbnail,
                title: title.slice(0, 100),
                body: `👁️ ${views} views • ⏱️ ${duration}`,
                sourceUrl: videoUrl,
                renderLargerThumbnail: true,
                mediaType: 1
              }
            }
          };

      await sock.sendMessage(targetJid, msgOpts, targetJid === from ? { quoted: message } : undefined);
      await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
      if (targetJid !== from) {
        await sock.sendMessage(from, { text: `✅ Sent "${title}" to the replied user.` }, { quoted: message });
      }

    } catch (error) {
      console.error('Play Error:', error.message);
      await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
      return sock.sendMessage(from, {
        text: `❌ Play failed: ${error.message}\n\nTry again or a different song.`
      }, { quoted: message });
    }
  }
};
