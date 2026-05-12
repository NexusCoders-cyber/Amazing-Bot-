import axios from 'axios';

export default {
    name: 'imdb',
    aliases: ['imbd'],
    category: 'downloader',
    description: 'Search movie details via OMDb (set OMDB_API_KEY)',
    usage: 'imdb <movie title>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const title = args.join(' ').trim();
        const apiKey = process.env.OMDB_API_KEY || process.env.OMDB_KEY;

        if (!apiKey) {
            return await sock.sendMessage(from, {
                text: '❌ Missing OMDB_API_KEY in environment.'
            }, { quoted: message });
        }

        try {
            const { data } = await axios.get('https://www.omdbapi.com/', {
                params: { t: title, apikey: apiKey },
                timeout: 15000
            });

            if (data?.Response === 'False') {
                return await sock.sendMessage(from, { text: `❌ Not found: ${title}` }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: `🎬 *${data.Title}* (${data.Year})\n⭐ IMDb: ${data.imdbRating}\n🎭 Genre: ${data.Genre}\n🎥 Director: ${data.Director}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed: ${error.message}` }, { quoted: message });
        }
    }
};
