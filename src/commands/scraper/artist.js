import axios from 'axios';

function extractSummary(wikiExtract) {
    if (!wikiExtract) return '';
    // Get first 2-3 sentences
    const sentences = wikiExtract.match(/[^.!?]+[.!?]+/g) || [wikiExtract];
    return sentences.slice(0, 3).join(' ').trim();
}

async function fetchWikipediaBio(name) {
    try {
        const { data } = await axios.get('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(name), {
            timeout: 10000,
            headers: { 'User-Agent': 'AstaBot/1.0' }
        });
        if (data?.extract) {
            return {
                bio: extractSummary(data.extract),
                url: data.content_urls?.desktop?.page || '',
                thumbnail: data.thumbnail?.source || ''
            };
        }
    } catch {}

    // Try with "musician" suffix
    try {
        const { data } = await axios.get('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(name + ' (musician)'), {
            timeout: 10000,
            headers: { 'User-Agent': 'AstaBot/1.0' }
        });
        if (data?.extract) {
            return {
                bio: extractSummary(data.extract),
                url: data.content_urls?.desktop?.page || '',
                thumbnail: data.thumbnail?.source || ''
            };
        }
    } catch {}

    return null;
}

export default {
    name: 'artist',
    aliases: ['singer', 'musician', 'artistinfo'],
    category: 'scraper',
    description: 'Get artist biography, details, and top songs',
    usage: 'artist <name> | artist songs <name>',
    cooldown: 5,

    async execute({ sock, message, args, from }) {
        if (!args.length) {
            return sock.sendMessage(from, {
                text: '🎤 *Artist Info*\n\nUsage:\n.artist <name> — bio, details & top songs\n.artist songs <name> — list songs\n\nExample:\n.artist Davido\n.artist songs Burna Boy'
            }, { quoted: message });
        }

        const isSongList = args[0].toLowerCase() === 'songs';
        if (isSongList) args.shift();
        const query = args.join(' ').trim();
        if (!query) {
            return sock.sendMessage(from, { text: '❌ Provide an artist name.' }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });

        try {
            if (isSongList) {
                return await listArtistSongs(sock, from, query, message);
            } else {
                return await showArtistInfo(sock, from, query, message);
            }
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(from, { text: `❌ Error: ${error.message}` }, { quoted: message });
        }
    }
};

async function showArtistInfo(sock, from, artist, message) {
    let name = artist;
    let fans = 0;
    let albums = 0;
    let hasRadio = false;
    let deezerLink = '';
    let picture = '';
    let tracks = [];
    let genres = [];

    // Fetch from Deezer
    try {
        const searchRes = await axios.get(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artist)}&limit=1`, { timeout: 15000 });
        const deezerArtist = searchRes?.data?.data?.[0];

        if (deezerArtist) {
            name = deezerArtist.name;
            const id = deezerArtist.id;
            const detailRes = await axios.get(`https://api.deezer.com/artist/${id}`, { timeout: 15000 });
            const info = detailRes.data;
            fans = info.nb_fan || 0;
            albums = info.nb_album || 0;
            hasRadio = info.radio || false;
            deezerLink = info.link || '';
            picture = info.picture_medium || info.picture || '';

            // Get top tracks
            const topRes = await axios.get(`https://api.deezer.com/artist/${id}/top?limit=15`, { timeout: 15000 });
            tracks = topRes?.data?.data || [];

            // Get albums for genre info
            const albumRes = await axios.get(`https://api.deezer.com/artist/${id}/albums?limit=5`, { timeout: 10000 });
            const albumData = albumRes?.data?.data || [];
            const genreSet = new Set();
            for (const alb of albumData) {
                if (alb.genres?.data) {
                    for (const g of alb.genres.data) {
                        if (g.name) genreSet.add(g.name);
                    }
                }
            }
            genres = [...genreSet];
        }
    } catch {}

    // Fetch Wikipedia bio
    const wiki = await fetchWikipediaBio(name);
    const bio = wiki?.bio || '';
    const wikiUrl = wiki?.url || '';
    const wikiThumb = wiki?.thumbnail || '';

    // Build response
    const lines = [`🎤 *${name}*`];
    
    if (genres.length) {
        lines.push(`🎵 Genre: ${genres.join(', ')}`);
    }
    if (fans) {
        lines.push(`👥 Fans: ${fans.toLocaleString()}`);
    }
    if (albums) {
        lines.push(`💿 Albums: ${albums}`);
    }
    lines.push(`📻 Radio: ${hasRadio ? '✅ Yes' : '❌ No'}`);

    if (bio) {
        lines.push('', `📖 *Biography:*`, bio);
    }

    if (tracks.length) {
        lines.push('', `🎵 *Top Songs:*`);
        tracks.slice(0, 10).forEach((t, i) => {
            const dur = t.duration ? ` ${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}` : '';
            lines.push(`${i + 1}. ${t.title}${dur}`);
        });
    }

    if (wikiUrl) {
        lines.push('', `📚 Wikipedia: ${wikiUrl}`);
    }

    const caption = lines.join('\n');
    const imageUrl = picture || wikiThumb;

    if (imageUrl) {
        await sock.sendMessage(from, {
            image: { url: imageUrl },
            caption
        }, { quoted: message });
    } else {
        await sock.sendMessage(from, { text: caption }, { quoted: message });
    }

    await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
}

async function listArtistSongs(sock, from, artist, message) {
    try {
        const { default: yts } = await import('yt-search');
        const search = await yts(`${artist} songs`);
        const videos = search?.videos?.slice(0, 20) || [];

        if (!videos.length) throw new Error('No songs found');

        const lines = [`🎵 *Songs by ${artist}*`, ''];
        videos.forEach((v, i) => {
            lines.push(`${i + 1}. ${v.title}`);
            lines.push(`   ⏱️ ${v.timestamp} | 👁️ ${v.views?.toLocaleString() || 'N/A'}`);
        });

        return sock.sendMessage(from, { text: lines.join('\n') }, { quoted: message });
    } catch {
        throw new Error(`No songs found for "${artist}".`);
    }
}
