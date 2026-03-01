import axios from 'axios';

const ANIME_TIMEOUT = 15000; // 15s for fetch
const REPLY_TIMEOUT = 300000; // 5 min for next

export default {
    name: 'anime',
    aliases: ['animevid', 'randomanime', 'av'],
    category: 'media',
    description: 'Get a random anime video',
    usage: 'anime',
    example: 'anime',
    cooldown: 3,
    permissions: ['user'],
    supportsReply: true,
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            await sock.sendMessage(from, {
                react: { text: '🎌', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: '⏳ Fetching random anime video...'
            }, { quoted: message });

            const apiUrl = 'https://arychauhann.onrender.com/api/animevideo';
            const { data } = await axios.get(apiUrl, {
                timeout: ANIME_TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            const videoUrl = data.url || data.data?.url || data.video;
            if (!videoUrl) {
                throw new Error('No video URL in response');
            }

            const caption = `🎌 *Random Anime Video*\n\n💡 Reply for another random one!`;

            const sentMsg = await sock.sendMessage(from, {
                video: { url: videoUrl },
                caption
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            if (sentMsg && sentMsg.key && sentMsg.key.id) {
                this.setupReplyListener(sock, from, sentMsg.key.id, sender, prefix);
            }

        } catch (error) {
            console.error('Anime command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Fetch timeout'
                : error.response?.status === 429
                ? 'Rate limit - wait a bit'
                : error.message || 'Failed to fetch video';

            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】
│
│ ⚠️ Anime video fetch failed
│
│ 📝 Error: ${errorMsg}
│
│ 🔄 Try again
│
╰────────────⦿`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    },

    setupReplyListener(sock, from, messageId, authorizedSender, prefix) {
        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }

        const existingHandler = global.replyHandlers[messageId];
        if (existingHandler && existingHandler.timeout) {
            clearTimeout(existingHandler.timeout);
        }

        const replyTimeout = setTimeout(() => {
            if (global.replyHandlers && global.replyHandlers[messageId]) {
                delete global.replyHandlers[messageId];
            }
        }, REPLY_TIMEOUT);

        global.replyHandlers[messageId] = {
            command: this.name,
            authorizedSender: authorizedSender,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                
                if (replySender !== authorizedSender) {
                    return;
                }

                try {
                    await sock.sendMessage(from, {
                        react: { text: '🎌', key: replyMessage.key }
                    });

                    const statusMsg = await sock.sendMessage(from, {
                        text: '⏳ Fetching random anime video...'
                    }, { quoted: replyMessage });

                    const apiUrl = 'https://arychauhann.onrender.com/api/animevideo';
                    const { data } = await axios.get(apiUrl, {
                        timeout: ANIME_TIMEOUT,
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    });

                    const videoUrl = data.url || data.data?.url || data.video;
                    if (!videoUrl) {
                        throw new Error('No video URL in response');
                    }

                    const caption = `🎌 *Random Anime Video*\n\n💡 Reply for another random one!`;

                    const newSentMsg = await sock.sendMessage(from, {
                        video: { url: videoUrl },
                        caption
                    }, { quoted: replyMessage });

                    await sock.sendMessage(from, {
                        react: { text: '✅', key: replyMessage.key }
                    });

                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];

                    if (newSentMsg && newSentMsg.key && newSentMsg.key.id) {
                        this.setupReplyListener(sock, from, newSentMsg.key.id, authorizedSender, prefix);
                    }

                } catch (error) {
                    console.error('Anime reply error:', error);

                    const errorMsg = error.code === 'ECONNABORTED'
                        ? 'Fetch timeout'
                        : error.response?.status === 429
                        ? 'Rate limit exceeded'
                        : error.message || 'Unknown error';

                    await sock.sendMessage(from, {
                        text: `❌ Failed to fetch video: ${errorMsg}\nTry again!`
                    }, { quoted: replyMessage });

                    await sock.sendMessage(from, {
                        react: { text: '❌', key: replyMessage.key }
                    });

                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                }
            }
        };
    }
};