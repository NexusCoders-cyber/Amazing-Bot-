import axios from 'axios';

const API_BASE = 'https://apis.prexzyvilla.site/anime';

export default {
    name: 'animewatch',
    aliases: ['anime', 'anidownload'],
    category: 'scraper',
    description: 'Search anime on AnimeKompi, download episodes as mp4',
    usage: 'anime <search term>',
    cooldown: 5,

    async execute({ sock, message, args, from }) {
        const query = args.join(' ').trim();
        if (!query) {
            return sock.sendMessage(from, {
                text: '🎬 *Anime Download*\n\n.anime <name>\nReply with number to select.\nReply with episode number to download.'
            }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });

        try {
            // Search anime via prexzyvilla
            const { data } = await axios.get(`${API_BASE}/animesearch?query=${encodeURIComponent(query)}`, { timeout: 20000 });
            const results = data?.data?.results || [];

            if (!results.length) {
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(from, { text: '❌ No anime found.' }, { quoted: message });
            }

            const list = results.slice(0, 10);
            let msg = '🎬 *Anime Results*\n\nReply with number:\n\n';
            list.forEach((a, i) => {
                msg += `${i + 1}. ${a.title}\n   📺 ${a.type || '?'} | ${a.status || '?'} | ⭐ ${a.rating || '?'}\n`;
            });

            const sentMsg = await sock.sendMessage(from, { text: msg }, { quoted: message });
            if (!global.replyHandlers) global.replyHandlers = {};

            global.replyHandlers[sentMsg.key.id] = {
                command: 'animewatch',
                handler: async (replyText, replyMessage) => {
                    const choice = parseInt(replyText.trim(), 10);
                    if (isNaN(choice) || choice < 1 || choice > list.length) {
                        return sock.sendMessage(from, { text: '❌ Invalid.' }, { quoted: replyMessage });
                    }
                    delete global.replyHandlers?.[sentMsg.key.id];

                    const selected = list[choice - 1];
                    const animeUrl = selected.url;
                    const title = selected.title;

                    await sock.sendMessage(from, { text: `📥 Fetching episodes for ${title}...` }, { quoted: replyMessage });

                    try {
                        const epRes = await axios.get(`${API_BASE}/animedetail?url=${encodeURIComponent(animeUrl)}`, { timeout: 20000 });
                        let episodes = epRes?.data?.data?.episodes || [];

                        if (!episodes.length) {
                            return sock.sendMessage(from, { text: `❌ No episodes found for ${title}.` }, { quoted: replyMessage });
                        }

                        const display = episodes.slice(0, 50);
                        let epList = `📺 *${title}*\n\nReply with number:\n\n`;
                        // Episodes come in reverse order (latest first)
                        const sorted = [...display].reverse();
                        sorted.forEach((ep, i) => {
                            epList += `${i + 1}. ${ep.title || ep.number || `Episode ${i + 1}`}\n`;
                        });

                        const epMsg = await sock.sendMessage(from, { text: epList }, { quoted: replyMessage });
                        global.replyHandlers[epMsg.key.id] = {
                            command: 'animewatch_ep',
                            handler: async (epReply, epReplyMsg) => {
                                const epChoice = parseInt(epReply.trim(), 10);
                                if (isNaN(epChoice) || epChoice < 1 || epChoice > sorted.length) {
                                    return sock.sendMessage(from, { text: '❌ Invalid.' }, { quoted: epReplyMsg });
                                }
                                delete global.replyHandlers?.[epMsg.key.id];

                                const epData = sorted[epChoice - 1];
                                const epTitle = epData.title || `Episode ${epChoice}`;
                                await downloadEpisode(sock, from, epReplyMsg, epData.url, title, epTitle);
                            }
                        };
                    } catch (epErr) {
                        await sock.sendMessage(from, { text: `❌ ${epErr.message}` }, { quoted: replyMessage });
                    }
                }
            };
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(from, { text: '❌ ' + error.message }, { quoted: message });
        }
    }
};

async function downloadEpisode(sock, from, msg, episodeUrl, animeTitle, epTitle) {
    await sock.sendMessage(from, { text: `🔍 Getting download links...` }, { quoted: msg });

    try {
        const dlRes = await axios.get(`${API_BASE}/animedownload?url=${encodeURIComponent(episodeUrl)}`, { timeout: 20000 });
        const data = dlRes?.data?.data || {};

        const title = data.title || epTitle;
        const servers = data.streamingServers || [];
        const downloads = data.downloadLinks || [];

        // Try to find a direct download URL
        let directUrl = null;

        // Check download links first
        if (downloads.length) {
            for (const dl of downloads) {
                if (dl.url && (dl.quality === 'Mp4' || dl.quality === 'GDrive')) {
                    directUrl = dl.url;
                    break;
                }
            }
            if (!directUrl && downloads[0]?.url) directUrl = downloads[0].url;
        }

        // If no direct URL, try streaming servers for iframe URLs
        if (!directUrl && servers.length) {
            const serverUrls = [];
            servers.forEach(s => {
                if (s.iframeSrc) serverUrls.push(s.iframeSrc);
            });
            if (serverUrls.length) {
                directUrl = serverUrls[0]; // First server's iframe URL
            }
        }

        const titleClean = title.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 50);

        if (directUrl) {
            // Try to send the video
            await sock.sendMessage(from, { text: `📥 Sending from ${servers[0]?.name || 'source'}...` }, { quoted: msg });

            // Check if it's a download link (mp4upload, gdriveplayer) vs embed
            if (directUrl.includes('download.php') || directUrl.includes('mp4upload')) {
                // Direct download URL - try to fetch and forward
                try {
                    const resp = await axios.get(directUrl, {
                        responseType: 'arraybuffer',
                        timeout: 120000,
                        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://v6.animekompi.fun/' }
                    });
                    const buffer = Buffer.from(resp.data);
                    await sock.sendMessage(from, {
                        document: buffer,
                        mimetype: 'video/mp4',
                        fileName: `${titleClean}.mp4`,
                        caption: `🎬 ${animeTitle} - ${epTitle}`
                    }, { quoted: msg });
                    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                    return;
                } catch {}
            }

            // Send as streaming link (most reliable)
            await sock.sendMessage(from, {
                text: `🎬 *${animeTitle} - ${epTitle}*\n\n📺 *Watch:* ${directUrl}\n\n💡 Open in Chrome to watch or download.`
            }, { quoted: msg });
        } else {
            // No URL found - show available servers as links
            let linkMsg = `🎬 *${animeTitle} - ${epTitle}*\n\n*Available sources:*\n\n`;
            servers.forEach((s, i) => {
                if (s.iframeSrc) {
                    const url = s.iframeSrc.startsWith('//') ? 'https:' + s.iframeSrc : s.iframeSrc;
                    linkMsg += `${i + 1}. ${s.name}: ${url}\n`;
                }
            });
            downloads.forEach((d, i) => {
                if (d.url) {
                    linkMsg += `\n📥 Download ${d.quality || i + 1}: ${d.url}`;
                }
            });

            if (linkMsg.length < 100) {
                linkMsg = `❌ No playable links found for this episode.`;
            }

            await sock.sendMessage(from, { text: linkMsg }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
    } catch (error) {
        await sock.sendMessage(from, { text: `❌ Failed: ${error.message}` }, { quoted: msg });
    }
}
