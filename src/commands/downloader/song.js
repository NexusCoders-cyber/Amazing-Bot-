import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SPOTIFY_CLIENT_ID = 'f9fff40f5e594655bb3215b658571231';
const SPOTIFY_CLIENT_SECRET = 'a51ac8aa4a354d24ae69c5f1335dd6db';

let spotifyToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
    if (spotifyToken && Date.now() < tokenExpiry) return spotifyToken;

    const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
    });

    spotifyToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return spotifyToken;
}

async function getSpotifyTrack(query) {
    try {
        const token = await getSpotifyToken();

        const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
        });

        const tracks = response.data?.tracks?.items;
        if (!tracks || tracks.length === 0) return null;

        return tracks.map(track => ({
            name: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album?.name || null,
            image: track.album?.images?.[0]?.url || null,
            spotifyUrl: track.external_urls?.spotify || null
        }));
    } catch (e) {
        return null;
    }
}

async function getSpotifyImage(title, channel) {
    try {
        const tracks = await getSpotifyTrack(`${title} ${channel}`);
        if (tracks && tracks.length > 0 && tracks[0].image) return tracks[0].image;

        const tracksByTitle = await getSpotifyTrack(title);
        if (tracksByTitle && tracksByTitle.length > 0 && tracksByTitle[0].image) return tracksByTitle[0].image;
    } catch (e) {}

    return null;
}

export default {
    name: 'song',
    aliases: ['sg'],
    category: 'downloader',
    description: 'Search and download audio',
    usage: 'song <search query>',
    example: 'song shape of you',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        const query = args.join(' ').trim();

        await sock.sendMessage(from, {
            react: { text: '🔍', key: message.key }
        });

        let searchResults = [];
        let spotifyTracks = null;

        [searchResults, spotifyTracks] = await Promise.all([
            (async () => {
                const results = [];

                try {
                    const searchRes = await axios.get(`https://meow-dl.onrender.com/music?q=${encodeURIComponent(query)}`, { timeout: 30000 });
                    const data = searchRes.data;
                    if (data && data.success && data.title) {
                        results.push({
                            title: data.title,
                            channel: data.channel || 'Unknown',
                            thumbnail: data.thumbnail || null,
                            videoId: data.videoId || null,
                            media: data.media || []
                        });
                    }
                } catch (e) {}

                try {
                    const params = new URLSearchParams();
                    params.set('url', query);
                    params.set('format', 'm4a');

                    const ytRes = await axios.get(`https://meow-dl.onrender.com/yt?${params.toString()}`, { timeout: 30000 });
                    const data = ytRes.data;
                    if (data && data.status === 'ok' && data.title) {
                        const alreadyExists = results.some(r => r.title === data.title);
                        if (!alreadyExists) {
                            results.push({
                                title: data.title,
                                channel: data.channel || 'Unknown',
                                thumbnail: null,
                                videoId: data.videoId || null,
                                downloadLink: data.downloadLink || null,
                                media: []
                            });
                        }
                    }
                } catch (e) {}

                return results;
            })(),
            getSpotifyTrack(query)
        ]);

        if (searchResults.length === 0 && (!spotifyTracks || spotifyTracks.length === 0)) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            return await sock.sendMessage(from, {
                text: `❌ No results found for: ${query}\n\n💡 Try different keywords`
            }, { quoted: message });
        }

        if (searchResults.length === 0 && spotifyTracks && spotifyTracks.length > 0) {
            searchResults = spotifyTracks.map(t => ({
                title: t.name,
                channel: t.artist,
                thumbnail: t.image,
                videoId: null,
                downloadLink: null,
                media: [],
                spotifyUrl: t.spotifyUrl
            }));
        }

        if (spotifyTracks && spotifyTracks.length > 0) {
            searchResults.forEach(track => {
                const match = spotifyTracks.find(s =>
                    s.name.toLowerCase().includes(track.title.toLowerCase().slice(0, 15)) ||
                    track.title.toLowerCase().includes(s.name.toLowerCase().slice(0, 15))
                );
                if (match) {
                    if (match.image) track.thumbnail = match.image;
                    if (match.artist) track.spotifyArtist = match.artist;
                    if (match.album) track.album = match.album;
                }
            });
        }

        if (searchResults.length === 1) {
            await this.downloadAndSend({ sock, message, from, sender, track: searchResults[0], query });
            return;
        }

        let listText = `🎵 *Search Results*\n\n`;

        searchResults.forEach((track, i) => {
            listText += `${i + 1}. *${track.title}*\n`;
            listText += `   🎤 ${track.spotifyArtist || track.channel}\n`;
            if (track.album) listText += `   💿 ${track.album}\n`;
            listText += `\n`;
        });

        listText += `Reply 1-${searchResults.length} to download`;

        const sentMsg = await sock.sendMessage(from, {
            text: listText
        }, { quoted: message });

        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }

        global.replyHandlers[sentMsg.key.id] = {
            command: 'song',
            handler: async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                if (replySender !== sender) return;

                const choice = parseInt(replyText.trim());
                if (isNaN(choice) || choice < 1 || choice > searchResults.length) {
                    return await sock.sendMessage(from, {
                        text: `Reply with a number between 1 and ${searchResults.length}`
                    }, { quoted: replyMessage });
                }

                delete global.replyHandlers[sentMsg.key.id];

                await this.downloadAndSend({ sock, message: replyMessage, from, sender, track: searchResults[choice - 1], query });
            }
        };
    },

    async downloadAndSend({ sock, message, from, sender, track, query }) {
        await sock.sendMessage(from, {
            react: { text: '⬇️', key: message.key }
        });

        const downloadMsg = await sock.sendMessage(from, {
            text: `⬇️ Downloading audio...\n\n🎵 ${track.title}\n🎤 ${track.spotifyArtist || track.channel}`
        }, { quoted: message });

        let tmpFilePath = null;

        try {
            let downloadLink = null;

            if (track.media && track.media.length > 0) {
                const audio = track.media.find(m => m.quality === '128kbps') || track.media[track.media.length - 1];
                downloadLink = audio.url;
            }

            if (!downloadLink && track.downloadLink) {
                downloadLink = track.downloadLink;
            }

            if (!downloadLink && track.videoId) {
                const params = new URLSearchParams();
                params.set('url', `https://www.youtube.com/watch?v=${track.videoId}`);
                params.set('format', 'm4a');

                const ytRes = await axios.get(`https://meow-dl.onrender.com/yt?${params.toString()}`, { timeout: 60000 });
                if (ytRes.data?.status === 'ok' && ytRes.data?.downloadLink) {
                    downloadLink = ytRes.data.downloadLink;
                }
            }

            if (!downloadLink) {
                const searchTitle = track.spotifyArtist ? `${track.spotifyArtist} ${track.title}` : track.title;
                const params = new URLSearchParams();
                params.set('url', searchTitle);
                params.set('format', 'm4a');

                const ytRes = await axios.get(`https://meow-dl.onrender.com/yt?${params.toString()}`, { timeout: 60000 });
                if (ytRes.data?.status === 'ok' && ytRes.data?.downloadLink) {
                    downloadLink = ytRes.data.downloadLink;
                }
            }

            if (!downloadLink) {
                await sock.sendMessage(from, { delete: downloadMsg.key });
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                return await sock.sendMessage(from, {
                    text: '❌ Failed to get download link'
                }, { quoted: message });
            }

            let coverImage = track.thumbnail;
            if (!coverImage) {
                coverImage = await getSpotifyImage(track.title, track.spotifyArtist || track.channel);
            }

            const safeName = `${track.title.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '').slice(0, 40)}.mp3`;
            tmpFilePath = path.join(os.tmpdir(), safeName);

            const response = await axios({
                url: downloadLink,
                method: 'GET',
                responseType: 'stream',
                timeout: 120000,
                maxContentLength: 50 * 1024 * 1024
            });

            const writer = fs.createWriteStream(tmpFilePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
                response.data.on('error', reject);
            });

            await sock.sendMessage(from, { delete: downloadMsg.key });

            const audioMsg = {
                audio: { url: tmpFilePath },
                mimetype: 'audio/mpeg',
                fileName: safeName,
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: track.title,
                        body: track.spotifyArtist || track.channel,
                        thumbnailUrl: coverImage || undefined,
                        sourceUrl: track.spotifyUrl || (track.videoId ? `https://www.youtube.com/watch?v=${track.videoId}` : undefined),
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: false
                    }
                }
            };

            try {
                await sock.sendMessage(from, audioMsg, { quoted: message });
            } catch (sendErr) {
                audioMsg.audio = fs.readFileSync(tmpFilePath);
                await sock.sendMessage(from, audioMsg, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

            fs.unlink(tmpFilePath, () => {});

        } catch (error) {
            console.error('Song download error:', error);

            if (tmpFilePath) {
                fs.unlink(tmpFilePath, () => {});
            }

            try { await sock.sendMessage(from, { delete: downloadMsg.key }); } catch (e) {}

            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });

            await sock.sendMessage(from, {
                text: `❌ Download failed: ${error.message}`
            }, { quoted: message });
        }
    }
};