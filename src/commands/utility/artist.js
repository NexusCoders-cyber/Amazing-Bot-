import axios from 'axios';

const SPOTIFY_CLIENT_ID = 'f9fff40f5e594655bb3215b658571231';
const SPOTIFY_CLIENT_SECRET = 'a51ac8aa4a354d24ae69c5f1335dd6db';

let spotifyToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
    if (spotifyToken && Date.now() < tokenExpiry) {
        return spotifyToken;
    }

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
                }
            }
        );

        spotifyToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
        return spotifyToken;
    } catch (error) {
        console.error('Spotify token error:', error.message);
        return null;
    }
}

async function searchSpotifyArtist(artistName) {
    try {
        const token = await getSpotifyToken();
        if (!token) return null;

        const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                q: artistName,
                type: 'artist',
                limit: 1
            }
        });

        if (searchResponse.data && searchResponse.data.artists && searchResponse.data.artists.items.length > 0) {
            const artist = searchResponse.data.artists.items[0];
            
            const artistDetails = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const topTracks = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    market: 'US'
                }
            });

            return {
                name: artist.name,
                image: artist.images[0]?.url || 'https://i.ibb.co/2M7rtLk/ilom.jpg',
                followers: artistDetails.data.followers?.total || 0,
                popularity: artistDetails.data.popularity || 0,
                genres: artistDetails.data.genres || [],
                url: artist.external_urls.spotify,
                topTracks: topTracks.data.tracks.slice(0, 5).map(t => t.name) || []
            };
        }
        return null;
    } catch (error) {
        console.error('Spotify artist search error:', error.message);
        return null;
    }
}

async function getMusicBrainzArtist(artistName) {
    try {
        const response = await axios.get('https://musicbrainz.org/ws/2/artist/', {
            params: {
                query: artistName,
                fmt: 'json',
                limit: 1
            },
            headers: {
                'User-Agent': 'AmazingBot/1.0 (contact@example.com)'
            },
            timeout: 15000
        });

        if (response.data && response.data.artists && response.data.artists.length > 0) {
            const artist = response.data.artists[0];
            return {
                name: artist.name,
                image: 'https://i.ibb.co/2M7rtLk/ilom.jpg',
                country: artist.country || 'Unknown',
                type: artist.type || 'Artist',
                disambiguation: artist.disambiguation || '',
                tags: artist.tags?.map(t => t.name).slice(0, 5) || [],
                url: `https://musicbrainz.org/artist/${artist.id}`
            };
        }
        return null;
    } catch (error) {
        console.error('MusicBrainz error:', error.message);
        return null;
    }
}

export default {
    name: 'artist',
    aliases: ['musician', 'singer'],
    category: 'utility',
    description: 'Search for artist information using Spotify API',
    usage: '.artist <artist name>',
    example: '.artist Adele\n.artist Drake',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: 10,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const artistName = args.join(' ').trim();

            if (!artistName) {
                await sock.sendMessage(from, {
                    text: `❌ *Missing Artist Name*\n\n📜 *Usage:* ${prefix}artist <artist name>\n\n🎤 *Example:*\n${prefix}artist Adele\n${prefix}artist Ed Sheeran\n${prefix}artist Drake`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const searchMessage = await sock.sendMessage(from, {
                text: `🔍 *Searching for:* ${artistName}\n⏳ Please wait...`
            }, { quoted: message });

            let artistData = await searchSpotifyArtist(artistName);
            let source = 'Spotify API';

            if (!artistData) {
                console.log('Spotify failed, trying MusicBrainz...');
                const mbData = await getMusicBrainzArtist(artistName);
                if (mbData) {
                    artistData = {
                        name: mbData.name,
                        image: mbData.image,
                        followers: 'N/A',
                        popularity: 'N/A',
                        genres: mbData.tags,
                        url: mbData.url,
                        topTracks: [],
                        country: mbData.country,
                        type: mbData.type
                    };
                    source = 'MusicBrainz API';
                }
            }

            if (!artistData) {
                await sock.sendMessage(from, { delete: searchMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Artist Not Found*\n\nNo information found for: *${artistName}*\n\n💡 *Try:*\n• Check spelling\n• Use full artist name\n• Try popular artists\n\n🎤 *Examples:*\n${prefix}artist Adele\n${prefix}artist The Weeknd\n${prefix}artist Taylor Swift`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, { delete: searchMessage.key });

            const followers = this.formatNumber(artistData.followers);
            const popularity = artistData.popularity !== 'N/A' ? `${artistData.popularity}/100` : 'N/A';
            const genresList = artistData.genres.length > 0 ? artistData.genres.join(', ') : 'N/A';
            const topTracksList = artistData.topTracks.length > 0 ? artistData.topTracks.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'N/A';
            const countryLine = artistData.country ? `\n*Country:* ${artistData.country}` : '';

            const infoText = `*🎤 Artist Info*\n\n*Name:* ${artistData.name}\n*Followers:* ${followers}\n*Popularity:* ${popularity}${countryLine}\n\n*Genres:* ${genresList}\n\n*Top Tracks:*\n${topTracksList}\n\n*Profile:* ${artistData.url}\n\n*Source:* ${source}\n\n💫 *Powered by Amazing Bot 🚀*`;

            await sock.sendMessage(from, {
                image: { url: artistData.image },
                caption: infoText
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Artist command error:', error);
            
            let errorMsg = error.message || 'Unknown error occurred';
            let errorTip = '💡 Try again with different artist name!';
            
            if (error.message.includes('timeout')) {
                errorTip = '💡 Request timeout. Check your connection.';
            } else if (error.message.includes('ENOTFOUND')) {
                errorTip = '💡 Network error. Check internet connection.';
            } else if (error.message.includes('401')) {
                errorTip = '💡 Spotify API authentication failed.';
            } else if (error.message.includes('429')) {
                errorTip = '💡 Rate limited. Wait a moment and try again.';
            }

            await sock.sendMessage(from, {
                text: `❌ *Search Failed*\n\n⚠️ Error: ${errorMsg}\n\n${errorTip}\n\n🎤 Try:\n• Different artist name\n• Popular artists (Adele, Drake, Ed Sheeran)\n• Check spelling`
            }, { quoted: message });
        }
    },

    formatNumber(num) {
        if (!num || num === 'N/A' || num === '0' || num === 0) return 'N/A';
        const number = parseInt(num);
        if (isNaN(number)) return 'N/A';
        if (number >= 1000000000) {
            return (number / 1000000000).toFixed(1) + 'B';
        } else if (number >= 1000000) {
            return (number / 1000000).toFixed(1) + 'M';
        } else if (number >= 1000) {
            return (number / 1000).toFixed(1) + 'K';
        }
        return number.toLocaleString();
    }
};