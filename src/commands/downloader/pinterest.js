import axios from 'axios';

const pinterestCache = new Map();
const SEARCH_TIMEOUT = 300000;
const MAX_IMAGES = 50;
const MIN_IMAGES = 1;

export default {
    name: 'pinterest',
    aliases: ['pin'],
    category: 'downloader',
    description: 'Search for images on Pinterest',
    usage: 'pinterest <query> [count]',
    example: 'pinterest wallpaper 5\npinterest nature',
    cooldown: 5,
    permissions: ['user'],
    supportsReply: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            let count = 5;
            let query = args.join(' ').trim();

            const lastArg = args[args.length - 1];
            const parsedCount = parseInt(lastArg);
            
            if (!isNaN(parsedCount) && parsedCount >= MIN_IMAGES && parsedCount <= MAX_IMAGES) {
                count = parsedCount;
                query = args.slice(0, -1).join(' ').trim();
            }

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `Usage: ${prefix}pinterest <search> [count]\n\nExamples:\n${prefix}pinterest wallpaper\n${prefix}pinterest nature 10\n\nCount: 1-${MAX_IMAGES} images (default: 5)\n\nReply to results for more images`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: `Searching Pinterest for "${query}"...\nRequested: ${count} images`
            }, { quoted: message });

            const apiUrl = `https://api.ccprojectsapis-jonell.gleeze.com/api/pin?title=${encodeURIComponent(query)}&count=${count}`;
            const { data } = await axios.get(apiUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (!data || !data.data || !Array.isArray(data.data)) {
                throw new Error('Invalid response from Pinterest API');
            }

            const images = data.data.filter(img => img && typeof img === 'string');
            
            if (images.length === 0) {
                await sock.sendMessage(from, {
                    text: `No images found for "${query}"\n\nTry a different search term`,
                    edit: statusMsg.key
                }, { quoted: message });
                return;
            }

            const caption = `Pinterest: ${query}\n\nShowing ${images.length} of ${count} requested images\n\nReply with a number (1-${MAX_IMAGES}) or new search term for more`;

            const sentMsg = await sock.sendMessage(from, {
                image: { url: images[0] },
                caption
            }, { quoted: message });

            for (let i = 1; i < images.length; i++) {
                await sock.sendMessage(from, {
                    image: { url: images[i] }
                }, { quoted: sentMsg });
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            if (sentMsg && sentMsg.key && sentMsg.key.id) {
                this.setupReplyListener(sock, from, sentMsg.key.id, query, sender, prefix);
            }

        } catch (error) {
            console.error('Pinterest command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Request timeout - try again'
                : error.response?.status === 429
                ? 'Rate limit exceeded - wait a moment'
                : error.message || 'Unknown error';

            await sock.sendMessage(from, {
                text: `Failed to fetch Pinterest images\n\nError: ${errorMsg}\n\nTry again in a moment`
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
        }, SEARCH_TIMEOUT);

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

                const input = replyText.trim();
                
                if (!input) {
                    return;
                }

                let searchQuery = originalQuery;
                let count = 5;

                const parsedNumber = parseInt(input);
                if (!isNaN(parsedNumber) && parsedNumber >= MIN_IMAGES && parsedNumber <= MAX_IMAGES) {
                    count = parsedNumber;
                } else {
                    searchQuery = input;
                }

                try {
                    await sock.sendMessage(from, {
                        react: { text: '🔍', key: replyMessage.key }
                    });

                    const statusMsg = await sock.sendMessage(from, {
                        text: `Searching Pinterest for "${searchQuery}"...\nRequested: ${count} images`
                    }, { quoted: replyMessage });

                    const apiUrl = `https://api.ccprojectsapis-jonell.gleeze.com/api/pin?title=${encodeURIComponent(searchQuery)}&count=${count}`;
                    const { data } = await axios.get(apiUrl, {
                        timeout: 15000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    });

                    if (!data || !data.data || !Array.isArray(data.data)) {
                        throw new Error('Invalid response from Pinterest API');
                    }

                    const images = data.data.filter(img => img && typeof img === 'string');
                    
                    if (images.length === 0) {
                        await sock.sendMessage(from, {
                            text: `No images found for "${searchQuery}"`,
                            edit: statusMsg.key
                        }, { quoted: replyMessage });
                        clearTimeout(replyTimeout);
                        delete global.replyHandlers[messageId];
                        return;
                    }

                    const caption = `Pinterest: ${searchQuery}\n\nShowing ${images.length} of ${count} requested images\n\nReply with a number (1-${MAX_IMAGES}) or new search term for more`;

                    const newSentMsg = await sock.sendMessage(from, {
                        image: { url: images[0] },
                        caption
                    }, { quoted: replyMessage });

                    for (let i = 1; i < images.length; i++) {
                        await sock.sendMessage(from, {
                            image: { url: images[i] }
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
                    console.error('Pinterest reply error:', error);

                    await sock.sendMessage(from, {
                        text: `Failed to fetch more images: ${error.message}`
                    }, { quoted: replyMessage });

                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                }
            }
        };
    }
};