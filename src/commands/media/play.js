import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import yts from 'yt-search';

export default {
    name: 'play',
    aliases: ['music',  'sing'],
    category: 'media',
    description: 'Download music audio from YouTube with thumbnail support',
    usage: 'play <YouTube URL or search query>',
    example: 'play shape of you\nplay https://youtube.com/watch?v=xxxxx',
    cooldown: 10,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const query = args.join(' ').trim();

            await sock.sendMessage(from, {
                react: { text: '⌛', key: message.key }
            });

            let searchResult;
            try {
                searchResult = await yts(query);
            } catch (error) {
                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
                return await sock.sendMessage(from, {
                    text: `❌ Search failed: ${error.message}`
                }, { quoted: message });
            }

            if (!searchResult.videos || searchResult.videos.length === 0) {
                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
                return await sock.sendMessage(from, {
                    text: `❌ No results found for: ${query}`
                }, { quoted: message });
            }

            const video = searchResult.videos[0];
            const youtubeUrl = video.url;

            const apiUrl = `https://meow-dl.onrender.com/music?q=${encodeURIComponent(query)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });
            const data = response.data;

            if (!data.success || !data.media || data.media.length === 0) {
                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
                return await sock.sendMessage(from, {
                    text: '❌ No audio available for this video'
                }, { quoted: message });
            }

            const audioInfo = data.media.find(m => m.quality === '128kbps') || data.media[data.media.length - 1];
            const audioUrl = audioInfo.url;

            const cleanTitle = data.title.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').trim();
            const channel = data.channel;
            const thumbnail = data.thumbnail;
            const videoId = data.videoId;
            const finalYoutubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

            const safeFileName = cleanTitle.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '').slice(0, 50);
            const tmpFilePath = path.join(os.tmpdir(), `${safeFileName}.mp3`);

            const writer = fs.createWriteStream(tmpFilePath);
            const audioStream = await axios.get(audioUrl, { 
                responseType: 'stream',
                timeout: 120000
            });

            audioStream.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            await sock.sendMessage(from, {
                document: { url: tmpFilePath },
                mimetype: 'audio/mpeg',
                fileName: `${safeFileName}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: cleanTitle,
                        body: `Artist: ${channel}`,
                        thumbnailUrl: thumbnail,
                        sourceUrl: finalYoutubeUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: false
                    }
                }
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            fs.unlink(tmpFilePath, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
            });

        } catch (error) {
            console.error('Play command error:', error);

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Request timeout'
                : error.response?.status === 429
                ? 'Rate limit exceeded'
                : error.message || 'Unknown error';

            await sock.sendMessage(from, {
                text: `❌ Command failed: ${errorMsg}`
            }, { quoted: message });
        }
    }
};