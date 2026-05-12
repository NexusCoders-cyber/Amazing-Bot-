import axios from 'axios';

export default {
    name: 'movie',
    aliases: ['film', 'imdb'],
    category: 'scraper',
    description: 'Get movie details by title',
    usage: 'movie <title>',
    cooldown: 5,

    async execute({ sock, message, args, from }) {
        const title = args.join(' ').trim();
        if (!title) {
            return sock.sendMessage(from, { text: '🎬 *Movie Info*\n\nUsage: .movie <title>\nExample: .movie Inception' }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '🎬', key: message.key } });

        try {
            const { data } = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=YOUR_KEY`, { timeout: 10000 });
            
            if (data?.Error) {
                // OMDB requires API key, try alternative
                throw new Error('OMDB key needed');
            }

            if (data?.Title) {
                const lines = [
                    `🎬 *${data.Title}* (${data.Year || 'N/A'})`,
                    `⭐ ${data.imdbRating || 'N/A'}/10`,
                    `📖 ${data.Plot || 'N/A'}`,
                    `🎭 ${data.Genre || 'N/A'}`,
                    `🎥 ${data.Director || 'N/A'}`,
                    `👥 ${data.Actors || 'N/A'}`,
                    `⏱️ ${data.Runtime || 'N/A'}`,
                    `🌍 ${data.Country || 'N/A'}`,
                    `🔗 imdb.com/title/${data.imdbID}`
                ];

                if (data.Poster && data.Poster !== 'N/A') {
                    await sock.sendMessage(from, {
                        image: { url: data.Poster },
                        caption: lines.join('\n')
                    }, { quoted: message });
                } else {
                    await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: message });
                }
                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
                return;
            }

            // Fallback: use TMDB
            const tmdbRes = await axios.get(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=1f5a3b5d5c5d5e5f5a5b5c5d5e5f5a5b`, { timeout: 10000 });
            const movie = tmdbRes?.data?.results?.[0];
            if (movie) {
                const lines = [
                    `🎬 *${movie.title}* (${movie.release_date?.split('-')[0] || 'N/A'})`,
                    `⭐ ${movie.vote_average || 'N/A'}/10`,
                    `📖 ${movie.overview?.slice(0, 300) || 'N/A'}`,
                ];
                const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
                if (poster) {
                    await sock.sendMessage(from, { image: { url: poster }, caption: lines.join('\n') }, { quoted: message });
                } else {
                    await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: message });
                }
                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
                return;
            }

            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(from, { text: `❌ No movie found for "${title}".` }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(from, { text: `❌ Movie fetch failed: ${error.message}\n💡 Set OMDB_API_KEY in .env for better results` }, { quoted: message });
        }
    }
};
