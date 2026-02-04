import axios from 'axios';
import font from '../../utils/font.js';

export default {
    name: 'lyrics',
    aliases: ['lyric', 'ly'],
    category: 'media',
    description: 'Fetch song lyrics with thumbnail',
    usage: 'lyrics <song name>',
    example: 'lyrics never gonna give you up',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        const query = args.join(' ');

        await sock.sendMessage(from, {
            react: { text: '🔍', key: message.key }
        });

        try {
            const res = await axios.get(`https://api.popcat.xyz/v2/lyrics?song=${encodeURIComponent(query)}`, {
                timeout: 30000
            });

            if (res.data.error || !res.data.message) {
                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
                return await sock.sendMessage(from, {
                    text: `❌ No lyrics found for: ${query}`
                }, { quoted: message });
            }

            const { title, artist, image, lyrics, url } = res.data.message;

            let msg = `🎶 ${font.bold(title.toUpperCase())}\n`;
            msg += `👤 Artist: ${artist}\n`;
            msg += `────────────────────\n\n`;

            const finalLyrics = lyrics.length > 3900 ? lyrics.substring(0, 3900) + '\n\n...[Lyrics Truncated]' : lyrics;
            msg += finalLyrics;

            await sock.sendMessage(from, {
                text: msg,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: artist,
                        thumbnailUrl: image,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: false
                    }
                }
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Lyrics command error:', error);

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });

            await sock.sendMessage(from, {
                text: `❌ Failed: ${error.message}`
            }, { quoted: message });
        }
    }
};