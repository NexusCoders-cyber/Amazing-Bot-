import axios from 'axios';

const NHENTAI_TIMEOUT = 15000; // 15s for fetch
const REPLY_TIMEOUT = 300000; // 5 min for next search

export default {
    name: 'nhentai',
    aliases: ['nhen', 'hentai', 'doujin'],
    category: 'media',
    description: 'Search for nhentai doujins',
    usage: 'nhentai <query>',
    example: 'nhentai baby',
    cooldown: 5,
    permissions: ['user'],
    supportsReply: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(from, {
                text: `╭──⦿【 📚 NHENTAI SEARCH 】
│
│ 💡 𝗨𝘀𝗮𝗴𝗲:
│    ${prefix}nhentai <search term>
│
│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀:
│    ${prefix}nhentai baby
│    ${prefix}nhentai schoolgirl
│
│ 🔄 𝗡𝗲𝘅𝘁 𝗦𝗲𝗮𝗿𝗰𝗵:
│    Reply to results with new query
│
╰────────────⦿`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: `⏳ Searching nhentai for "${query}"...`
            }, { quoted: message });

            const apiUrl = `https://arychauhann.onrender.com/api/nhentai?query=${encodeURIComponent(query)}`;
            const { data } = await axios.get(apiUrl, {
                timeout: NHENTAI_TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            // API returns object with keys "0" to "4" (or fewer), each with title, imgSrc, link
            const results = [];
            for (let i = 0; i < 5; i++) {
                if (data[i]) {
                    results.push({
                        title: data[i].title || 'Unknown Title',
                        imgSrc: `https://nhentai.net${data[i].imgSrc}` || '', // Prepend domain if relative
                        link: data[i].link || ''
                    });
                }
            }

            if (results.length === 0) {
                await sock.sendMessage(from, {
                    text: `❌ No results found for "${query}"`,
                    edit: statusMsg.key
                }, { quoted: message });
                return;
            }

            // Send first result as image (no video, so image)
            const firstResult = results[0];
            let caption = `📚 *${firstResult.title}*\n\n🔗 View full: ${firstResult.link}\n\nFound ${results.length} results.\n💡 Reply for new search!`;

            const sentMsg = await sock.sendMessage(from, {
                image: { url: firstResult.imgSrc },
                caption
            }, { quoted: message });

            // Send remaining as images with short captions
            for (let i = 1; i < results.length; i++) {
                const res = results[i];
                await sock.sendMessage(from, {
                    image: { url: res.imgSrc },
                    caption: `📚 ${res.title}\n🔗 ${res.link}`
                }, { quoted: sentMsg });
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            if (sentMsg && sentMsg.key && sentMsg.key.id) {
                this.setupReplyListener(sock, from, sentMsg.key.id, query, sender, prefix);
            }

        } catch (error) {
            console.error('Nhentai command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Search timeout'
                : error.response?.status === 429
                ? 'Rate limit - wait a bit'
                : error.message || 'Failed to search';

            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】
│
│ ⚠️ Nhentai search failed
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

    setupReplyListener(sock, from, messageId, originalQuery, authorizedSender, prefix) {
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
            originalQuery: originalQuery,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                
                if (replySender !== authorizedSender) {
                    return;
                }

                const newQuery = replyText.trim();
                const searchQuery = newQuery || originalQuery;

                try {
                    await sock.sendMessage(from, {
                        react: { text: '🔍', key: replyMessage.key }
                    });

                    const statusMsg = await sock.sendMessage(from, {
                        text: `⏳ Searching nhentai for "${searchQuery}"...`
                    }, { quoted: replyMessage });

                    const apiUrl = `https://arychauhann.onrender.com/api/nhentai?query=${encodeURIComponent(searchQuery)}`;
                    const { data } = await axios.get(apiUrl, {
                        timeout: NHENTAI_TIMEOUT,
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    });

                    const results = [];
                    for (let i = 0; i < 5; i++) {
                        if (data[i]) {
                            results.push({
                                title: data[i].title || 'Unknown Title',
                                imgSrc: `https://nhentai.net${data[i].imgSrc}` || '',
                                link: data[i].link || ''
                            });
                        }
                    }

                    if (results.length === 0) {
                        await sock.sendMessage(from, {
                            text: `❌ No results found for "${searchQuery}"`,
                            edit: statusMsg.key
                        }, { quoted: replyMessage });
                        return;
                    }

                    const firstResult = results[0];
                    let caption = `📚 *${firstResult.title}*\n\n🔗 View full: ${firstResult.link}\n\nFound ${results.length} results.\n💡 Reply for new search!`;

                    const newSentMsg = await sock.sendMessage(from, {
                        image: { url: firstResult.imgSrc },
                        caption
                    }, { quoted: replyMessage });

                    for (let i = 1; i < results.length; i++) {
                        const res = results[i];
                        await sock.sendMessage(from, {
                            image: { url: res.imgSrc },
                            caption: `📚 ${res.title}\n🔗 ${res.link}`
                        }, { quoted: newSentMsg });
                    }

                    await sock.sendMessage(from, {
                        react: { text: '✅', key: replyMessage.key }
                    });

                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];

                    if (newSentMsg && newSentMsg.key && newSentMsg.key.id) {
                        this.setupReplyListener(sock, from, newSentMsg.key.id, searchQuery, authorizedSender, prefix);
                    }

                } catch (error) {
                    console.error('Nhentai reply error:', error);

                    const errorMsg = error.code === 'ECONNABORTED'
                        ? 'Search timeout'
                        : error.response?.status === 429
                        ? 'Rate limit exceeded'
                        : error.message || 'Unknown error';

                    await sock.sendMessage(from, {
                        text: `❌ Failed to search: ${errorMsg}\nTry again!`
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