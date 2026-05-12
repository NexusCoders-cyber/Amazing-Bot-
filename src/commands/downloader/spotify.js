import ky from 'ky';

async function spotifySearch(query) {
    const payload = await ky
        .get('https://omegatech-api.dixonomega.tech/api/Search/Spotify', {
            searchParams: { action: 'search', query },
            timeout: 30000
        })
        .json();

    if (!payload?.success || !Array.isArray(payload?.results) || payload.results.length === 0) {
        throw new Error('No Spotify results found');
    }

    return payload.results[0];
}

async function spotifyDownload(spotifyUrl) {
    const payload = await ky
        .get('https://omegatech-api.dixonomega.tech/api/download/all', {
            searchParams: { url: spotifyUrl },
            timeout: 60000
        })
        .json();

    if (!payload?.success || !payload?.result?.audio?.length) {
        throw new Error('Spotify download URL not found');
    }

    return payload.result.audio[0].url;
}

export default {
    name: 'spotify',
    aliases: ['spdl', 'spotdl'],
    category: 'downloader',
    description: 'Search Spotify and send audio',
    usage: 'spotify <song name>',
    cooldown: 8,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const query = args.join(' ').trim();
        if (!query) {
            return await sock.sendMessage(from, { text: '❌ Usage: .spotify <song name>' }, { quoted: message });
        }

        try {
            const track = await spotifySearch(query);
            const downloadUrl = await spotifyDownload(track.spotifyUrl);

            await sock.sendMessage(from, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: track.thumbnail
                    ? {
                        externalAdReply: {
                            title: track.title,
                            body: track.artist,
                            thumbnailUrl: track.thumbnail,
                            sourceUrl: track.spotifyUrl,
                            renderLargerThumbnail: true,
                            mediaType: 1
                        }
                    }
                    : undefined
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Spotify failed: ${error.message}`
            }, { quoted: message });
        }
    }
};
