import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default {
    name: 'song',
    aliases: ['sg'],
    category: 'media',
    description: 'Search and download audio from Spotify',
    usage: 'song <search query>',
    example: 'song shape of you',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const query = args.join(' ').trim();

            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const searchMessage = await sock.sendMessage(from, {
                text: `🔍 Searching Spotify for: ${query}\n\n⏳ Please wait...`
            }, { quoted: message });

            const searchRes = await axios.get(`https://api.ccprojectsapis-jonell.gleeze.com/api/spotifysearch?q=${encodeURIComponent(query)}`, {
                timeout: 15000
            });

            const results = searchRes.data.results;

            if (!results || results.length === 0) {
                await sock.sendMessage(from, {
                    text: `❌ No results found for: ${query}\n\n💡 Try different keywords`,
                    edit: searchMessage.key
                });
                return;
            }

            let listMsg = `🎵 Spotify Search Results\n\n`;
            listMsg += `📝 Query: ${query}\n`;
            listMsg += `━━━━━━━━━━━━━━━━━━\n\n`;

            results.slice(0, 5).forEach((track, i) => {
                listMsg += `${i + 1}. ${track.title}\n`;
                listMsg += `   🎤 ${track.artist}\n`;
                listMsg += `   💿 ${track.album}\n`;
                listMsg += `   ⏱️ ${track.duration}\n`;
                listMsg += `   📅 ${track.release_date}\n\n`;
            });

            listMsg += `━━━━━━━━━━━━━━━━━━\n`;
            listMsg += `💡 Reply with a number (1-5) to download`;

            await sock.sendMessage(from, {
                text: listMsg,
                edit: searchMessage.key
            });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            if (!global.replyHandlers) {
                global.replyHandlers = {};
            }

            global.replyHandlers[searchMessage.key.id] = {
                command: 'song',
                handler: async (replyText, replyMessage) => {
                    const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;

                    if (replySender !== sender) {
                        return await sock.sendMessage(from, {
                            text: '❌ This is not your search!\n\n💡 Use: ' + prefix + 'song <query>'
                        }, { quoted: replyMessage });
                    }

                    const choice = parseInt(replyText.trim());

                    if (isNaN(choice) || choice < 1 || choice > results.length) {
                        return await sock.sendMessage(from, {
                            text: '❌ Invalid selection\n\nPlease reply with a number between 1 and 5'
                        }, { quoted: replyMessage });
                    }

                    const selectedTrack = results[choice - 1];

                    await sock.sendMessage(from, {
                        react: { text: '⬇️', key: replyMessage.key }
                    });

                    const downloadMessage = await sock.sendMessage(from, {
                        text: `📥 Downloading: ${selectedTrack.title}\n🎤 Artist: ${selectedTrack.artist}\n\n⏳ Please wait...`
                    }, { quoted: replyMessage });

                    try {
                        const dlRes = await axios.get(`https://api.ccprojectsapis-jonell.gleeze.com/api/spotify?url=${encodeURIComponent(selectedTrack.track_url)}`, {
                            timeout: 60000
                        });

                        const { mp3DownloadLink, songTitle, artist, coverImage } = dlRes.data;

                        if (!mp3DownloadLink) {
                            await sock.sendMessage(from, {
                                text: '❌ Failed to fetch audio file\n\n⚠️ The track may not be available\n💡 Try another song',
                                edit: downloadMessage.key
                            });
                            return;
                        }

                        const tmpFileName = `${songTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
                        const tmpFilePath = path.join(os.tmpdir(), tmpFileName);
                        const writer = fs.createWriteStream(tmpFilePath);

                        const audioStream = await axios.get(mp3DownloadLink, {
                            responseType: 'stream',
                            timeout: 120000,
                            maxContentLength: 50 * 1024 * 1024
                        });

                        audioStream.data.pipe(writer);

                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                        });

                        await sock.sendMessage(from, {
                            text: `✅ Download Complete!\n\n🎵 Sending audio file...`,
                            edit: downloadMessage.key
                        });

                        let thumbnailBuffer = null;
                        if (coverImage) {
                            try {
                                const imgResponse = await axios.get(coverImage, {
                                    responseType: 'arraybuffer',
                                    timeout: 15000
                                });
                                thumbnailBuffer = Buffer.from(imgResponse.data);
                            } catch (imgError) {
                                console.error('Failed to download cover image:', imgError);
                            }
                        }

                        const audioMessage = {
                            audio: { url: tmpFilePath },
                            mimetype: 'audio/mpeg',
                            fileName: tmpFileName,
                            ptt: false
                        };

                        if (thumbnailBuffer) {
                            audioMessage.contextInfo = {
                                externalAdReply: {
                                    title: songTitle,
                                    body: artist,
                                    thumbnailUrl: coverImage,
                                    sourceUrl: selectedTrack.track_url,
                                    mediaType: 1,
                                    renderLargerThumbnail: true,
                                    showAdAttribution: false
                                }
                            };
                        }

                        try {
                            await sock.sendMessage(from, audioMessage, { quoted: replyMessage });

                            await sock.sendMessage(from, {
                                react: { text: '✅', key: replyMessage.key }
                            });

                        } catch (sendError) {
                            const audioBuffer = fs.readFileSync(tmpFilePath);

                            const fallbackMessage = {
                                audio: audioBuffer,
                                mimetype: 'audio/mpeg',
                                fileName: tmpFileName,
                                ptt: false
                            };

                            if (thumbnailBuffer) {
                                fallbackMessage.contextInfo = {
                                    externalAdReply: {
                                        title: songTitle,
                                        body: artist,
                                        thumbnailUrl: coverImage,
                                        sourceUrl: selectedTrack.track_url,
                                        mediaType: 1,
                                        renderLargerThumbnail: true,
                                        showAdAttribution: false
                                    }
                                };
                            }

                            await sock.sendMessage(from, fallbackMessage, { quoted: replyMessage });

                            await sock.sendMessage(from, {
                                react: { text: '✅', key: replyMessage.key }
                            });
                        }

                        fs.unlink(tmpFilePath, (err) => {
                            if (err) console.error('Failed to delete temp file:', err);
                        });

                        delete global.replyHandlers[searchMessage.key.id];

                    } catch (downloadError) {
                        await sock.sendMessage(from, {
                            text: `❌ Download Failed\n\n⚠️ Error: ${downloadError.message}\n\n💡 Try:\n• Different song\n• Check internet connection\n• Try again later`,
                            edit: downloadMessage.key
                        });

                        await sock.sendMessage(from, {
                            react: { text: '❌', key: replyMessage.key }
                        });
                    }
                }
            };

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Search Failed\n\n⚠️ Error: ${error.message}\n\n💡 Try:\n• Different search terms\n• Check spelling\n• Try again later`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};
