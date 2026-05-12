import axios from 'axios';

export default {
    name: 'ms',
    aliases: ['mangasearch', 'manga', 'searchmanga', 'mangadetail', 'mangachapter', 'mangaepisodes', 'mangaseries', 'mangasuggest'],
    category: 'utility',
    description: 'Search for manga and display results with images.',
    usage: 'ms <query> | mangadetail <id> | mangachapter <chapter_id>',
    example: 'ms Gojo',
    cooldown: 7,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: Infinity,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from }) {
        const rawText = message?.message?.conversation || message?.message?.extendedTextMessage?.text || '';
        const commandToken = rawText.trim().split(/\s+/)[0].replace(/^[./!#]/, '').toLowerCase();
        const quotedText = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
            || message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text
            || '';
        const query = args.join(' ') || String(quotedText).trim();

        if (!query.trim()) {
            return await sock.sendMessage(from, {
                text: '❗ Please provide a manga search query.'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            if (['mangadetail'].includes(commandToken)) {
                const { data } = await axios.get('https://apis.prexzyvilla.site/anime/manga-detail', {
                    params: { id: query },
                    timeout: 35000
                });
                const payload = data?.result || data?.data || data;
                const image = payload?.image || payload?.cover || payload?.thumbnail;
                const caption = [
                    `📘 *${payload?.title || payload?.name || 'Manga Detail'}*`,
                    `ID: ${query}`,
                    payload?.status ? `Status: ${payload.status}` : '',
                    payload?.author ? `Author: ${payload.author}` : '',
                    payload?.genres ? `Genres: ${Array.isArray(payload.genres) ? payload.genres.join(', ') : payload.genres}` : '',
                    '',
                    `${payload?.description || payload?.synopsis || 'No description.'}`.slice(0, 1200)
                ].filter(Boolean).join('\n');
                if (image) {
                    return await sock.sendMessage(from, { image: { url: image }, caption }, { quoted: message });
                }
                return await sock.sendMessage(from, { text: caption }, { quoted: message });
            }

            if (['mangachapter'].includes(commandToken)) {
                const { data } = await axios.get('https://apis.prexzyvilla.site/anime/manga-chapter', {
                    params: { chapter_id: query || '', id: query || '' },
                    timeout: 35000
                });
                const payload = data?.result || data?.data || data;
                const pages = payload?.pages || payload?.images || [];
                const msg = [
                    `📖 *Manga Chapter*`,
                    `Input: ${query}`,
                    `Pages: ${Array.isArray(pages) ? pages.length : 'N/A'}`,
                    payload?.title || payload?.name || ''
                ].filter(Boolean).join('\n');
                return await sock.sendMessage(from, { text: msg }, { quoted: message });
            }

            if (['mangaepisodes'].includes(commandToken) || ['mangaseries'].includes(commandToken) || ['mangasuggest'].includes(commandToken)) {
                const endpoint = commandToken === 'mangaepisodes'
                    ? 'manga-episodes'
                    : commandToken === 'mangaseries'
                        ? 'manga-series'
                        : 'manga-suggestions';
                const params = commandToken === 'mangasuggest' ? { suggestion_type: query } : { id: query };
                const { data } = await axios.get(`https://apis.prexzyvilla.site/anime/${endpoint}`, { params, timeout: 35000 });
                const payload = data?.result || data?.data || data;
                return await sock.sendMessage(from, {
                    text: `✅ ${endpoint} response\n\n${JSON.stringify(payload, null, 2).slice(0, 3500)}`
                }, { quoted: message });
            }

            const apiUrl = `https://apis.prexzyvilla.site/anime/manga-search?query=${encodeURIComponent(query)}`;

            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const raw = response.data;
            const data = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.result)
                    ? raw.result
                    : Array.isArray(raw?.data)
                        ? raw.data
                        : [];

            if (!data.length) {
                throw new Error('No manga results found');
            }

            const best = data.find((item) => item?.image || item?.cover || item?.thumbnail) || data[0];
            const title = best?.title || best?.name || 'Untitled';
            const description = best?.description || best?.synopsis || 'No description available.';
            const imageUrl = best?.image || best?.cover || best?.thumbnail;
            const link = best?.link || best?.url || '';

            const caption = `📚 *Manga Search*\n` +
                `🔎 Query: ${query}\n\n` +
                `🔖 *${title}*\n` +
                `${description.substring(0, 450)}${description.length > 450 ? '...' : ''}` +
                `${link ? `\n\n🔗 ${link}` : ''}`;

            if (imageUrl) {
                await sock.sendMessage(from, {
                    image: { url: imageUrl },
                    caption
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, { text: caption }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (err) {
            console.error('Mangasearch command error:', err);
            await sock.sendMessage(from, {
                text: `❌ Failed to search manga: ${err.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};
