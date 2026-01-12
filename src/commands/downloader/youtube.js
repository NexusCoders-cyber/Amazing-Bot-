import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import yts from 'yt-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APIs = [
    {
        name: 'OriginalAPI',
        download: async (url, type) => {
            const format = type === 'audio' ? 'm4a' : 'mp4';
            const quality = type === 'video' ? '480' : undefined;
            const apiUrl = `https://meow-dl.onrender.com/yt?url=${encodeURIComponent(url)}${type === 'video' ? `&format=${format}&quality=${quality}` : `&format=${format}`}`;
            const response = await axios.get(apiUrl, { timeout: 30000 });
            if (response.data?.status === 'ok' && response.data?.downloadLink) {
                return {
                    downloadLink: response.data.downloadLink,
                    title: response.data.title || 'Unknown',
                    channel: response.data.channel || 'Unknown',
                    duration: response.data.duration_seconds ? `${Math.floor(response.data.duration_seconds/60)}:${String(response.data.duration_seconds%60).padStart(2,'0')}` : '0:00'
                };
            }
            throw new Error('No download link');
        }
    },
    {
        name: 'API2',
        download: async (url, type) => {
            const apiUrl = `https://api.betabotz.eu.org/api/download/yt${type === 'audio' ? 'mp3' : 'mp4'}?url=${encodeURIComponent(url)}&apikey=beta-Ibrahim1209`;
            const response = await axios.get(apiUrl, { timeout: 30000 });
            if (response.data?.result?.mp3 || response.data?.result?.mp4) {
                return {
                    downloadLink: type === 'audio' ? response.data.result.mp3 : response.data.result.mp4,
                    title: response.data.result.title || 'Unknown',
                    channel: response.data.result.channel || 'Unknown',
                    duration: response.data.result.duration || '0:00'
                };
            }
            throw new Error('No download link');
        }
    },
    {
        name: 'API3',
        download: async (url, type) => {
            const apiUrl = `https://api.siputzx.my.id/api/d/ytmp${type === 'audio' ? '3' : '4'}?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 30000 });
            if (response.data?.data?.dl) {
                return {
                    downloadLink: response.data.data.dl,
                    title: response.data.data.title || 'Unknown',
                    channel: response.data.data.channel || 'Unknown',
                    duration: response.data.data.duration || '0:00'
                };
            }
            throw new Error('No download link');
        }
    },
    {
        name: 'API4',
        download: async (url, type) => {
            const apiUrl = `https://api.agatz.xyz/api/ytmp${type === 'audio' ? '3' : '4'}?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 30000 });
            if (response.data?.data?.download) {
                return {
                    downloadLink: response.data.data.download,
                    title: response.data.data.title || 'Unknown',
                    channel: response.data.data.channel || 'Unknown',
                    duration: response.data.data.duration || '0:00'
                };
            }
            throw new Error('No download link');
        }
    }
];

async function tryAPIs(type, url) {
    for (const api of APIs) {
        try {
            console.log(`Trying ${api.name} for ${type}...`);
            const result = await api.download(url, type);
            console.log(`${api.name} succeeded!`);
            return result;
        } catch (error) {
            console.log(`${api.name} failed: ${error.message}`);
            continue;
        }
    }
    throw new Error('All APIs failed');
}

export default {
    name: 'ytb',
    aliases: ['youtube', 'y', 'yt'],
    category: 'downloader',
    description: 'Download YouTube videos or audio',
    usage: 'ytb <audio|video|-a|-v> <search query>',
    example: 'ytb audio baby girl joeboy\nytb -v shape of you',
    cooldown: 30,
    permissions: ['user'],
    args: true,
    minArgs: 2,

    async execute({ sock, message, args, from, sender }) {
        try {
            let type = null;
            if (['audio', '-a'].includes(args[0].toLowerCase())) {
                type = 'audio';
                args.shift();
            } else if (['video', '-v'].includes(args[0].toLowerCase())) {
                type = 'video';
                args.shift();
            } else {
                return await sock.sendMessage(from, {
                    text: `❌ *Invalid Type*\n\n` +
                          `Please specify audio (-a) or video (-v)\n\n` +
                          `*Usage:*\n` +
                          `• .ytb audio <query>\n` +
                          `• .ytb -v <query>\n\n` +
                          `*Example:*\n` +
                          `.ytb audio baby girl joeboy`
                }, { quoted: message });
            }

            const query = args.join(' ').trim();
            if (!query) {
                return await sock.sendMessage(from, {
                    text: '❌ Please provide a search query after the type'
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const searchMsg = await sock.sendMessage(from, {
                text: `🔍 *Searching YouTube*\n\nQuery: ${query}\n⏳ Please wait...`
            }, { quoted: message });

            const results = await yts(query);
            const videos = results.videos.slice(0, 5);

            if (!videos || videos.length === 0) {
                await sock.sendMessage(from, { delete: searchMsg.key });
                return await sock.sendMessage(from, {
                    text: `❌ *No Results Found*\n\nNo videos found for: "${query}"`
                }, { quoted: message });
            }

            await sock.sendMessage(from, { delete: searchMsg.key });

            let listText = `🎵 *YouTube ${type === 'audio' ? 'Audio' : 'Video'} Search*\n\n`;
            listText += `📝 Query: ${query}\n`;
            listText += `━━━━━━━━━━━━━━━━━━\n\n`;

            videos.forEach((video, i) => {
                listText += `${i + 1}. *${video.title}*\n`;
                listText += `   ⏱️ ${video.timestamp} | 👤 ${video.author.name}\n`;
                listText += `   👁️ ${video.views.toLocaleString()} views\n\n`;
            });

            listText += `━━━━━━━━━━━━━━━━━━\n`;
            listText += `Reply with a number (1-5) to download`;

            const sentMsg = await sock.sendMessage(from, {
                text: listText
            }, { quoted: message });

            if (!global.replyHandlers) {
                global.replyHandlers = {};
            }

            global.replyHandlers[sentMsg.key.id] = {
                command: 'ytb',
                handler: async (replyText, replyMessage) => {
                    const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;

                    if (replySender !== sender) {
                        return await sock.sendMessage(from, {
                            text: '❌ This is not your search!\n\nUse .ytb to search for yourself'
                        }, { quoted: replyMessage });
                    }

                    const choice = parseInt(replyText.trim());

                    if (isNaN(choice) || choice < 1 || choice > videos.length) {
                        return await sock.sendMessage(from, {
                            text: '❌ Invalid selection. Please reply with a number between 1 and 5'
                        }, { quoted: replyMessage });
                    }

                    const selectedVideo = videos[choice - 1];

                    await sock.sendMessage(from, {
                        react: { text: '⬇️', key: replyMessage.key }
                    });

                    const downloadMsg = await sock.sendMessage(from, {
                        text: `📥 *Downloading ${type === 'audio' ? 'Audio' : 'Video'}*\n\n` +
                              `🎵 ${selectedVideo.title}\n` +
                              `👤 ${selectedVideo.author.name}\n` +
                              `⏱️ ${selectedVideo.timestamp}\n\n` +
                              `⏳ Please wait...`
                    }, { quoted: replyMessage });

                    let tmpFilePath = null;

                    try {
                        const dlData = await tryAPIs(type, selectedVideo.url);

                        if (!dlData || !dlData.downloadLink) {
                            await sock.sendMessage(from, { delete: downloadMsg.key });
                            return await sock.sendMessage(from, {
                                text: `❌ *Download Failed*\n\n` +
                                      `Could not get download link.\n` +
                                      `All APIs failed. Try again later.`
                            }, { quoted: replyMessage });
                        }

                        const format = type === 'audio' ? 'm4a' : 'mp4';
                        const safeName = `${dlData.title.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '').slice(0, 40)}.${format}`;
                        const cacheDir = path.join(process.cwd(), 'temp', 'downloads');
                        await fs.ensureDir(cacheDir);
                        tmpFilePath = path.join(cacheDir, safeName);

                        const response = await axios({
                            url: dlData.downloadLink,
                            method: 'GET',
                            responseType: 'stream',
                            timeout: 120000,
                            maxContentLength: 100 * 1024 * 1024
                        });

                        const writer = fs.createWriteStream(tmpFilePath);
                        response.data.pipe(writer);

                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                            response.data.on('error', reject);
                        });

                        await sock.sendMessage(from, { delete: downloadMsg.key });

                        if (type === 'audio') {
                            await sock.sendMessage(from, {
                                audio: { url: tmpFilePath },
                                mimetype: 'audio/mp4',
                                fileName: safeName,
                                ptt: false,
                                contextInfo: {
                                    externalAdReply: {
                                        title: dlData.title,
                                        body: dlData.channel,
                                        thumbnailUrl: selectedVideo.thumbnail,
                                        mediaType: 1,
                                        renderLargerThumbnail: true
                                    }
                                }
                            }, { quoted: replyMessage });
                        } else {
                            await sock.sendMessage(from, {
                                video: { url: tmpFilePath },
                                mimetype: 'video/mp4',
                                fileName: safeName,
                                caption: `📺 *${dlData.title}*\n\n` +
                                        `👤 ${dlData.channel}\n` +
                                        `⏱️ ${dlData.duration}`
                            }, { quoted: replyMessage });
                        }

                        await sock.sendMessage(from, {
                            react: { text: '✅', key: replyMessage.key }
                        });

                        if (tmpFilePath && await fs.pathExists(tmpFilePath)) {
                            await fs.unlink(tmpFilePath).catch(() => {});
                        }

                        delete global.replyHandlers[sentMsg.key.id];

                    } catch (downloadError) {
                        console.error('Download error:', downloadError);

                        if (tmpFilePath && await fs.pathExists(tmpFilePath)) {
                            await fs.unlink(tmpFilePath).catch(() => {});
                        }

                        await sock.sendMessage(from, { delete: downloadMsg.key });
                        await sock.sendMessage(from, {
                            text: `❌ *Download Failed*\n\n` +
                                  `Error: ${downloadError.message}\n\n` +
                                  `Try:\n` +
                                  `• Different video\n` +
                                  `• Again later\n` +
                                  `• Contact bot owner`
                        }, { quoted: replyMessage });

                        await sock.sendMessage(from, {
                            react: { text: '❌', key: replyMessage.key }
                        });
                    }
                }
            };

        } catch (error) {
            console.error('YTB command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Search Failed*\n\n` +
                      `Error: ${error.message}\n\n` +
                      `Please try again later`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};