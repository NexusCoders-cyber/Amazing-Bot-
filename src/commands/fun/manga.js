import axios from 'axios';

export default {
    name: 'manga',
    category: 'fun',
    description: 'Search anime/manga titles (Jikan API)',
    usage: 'manga <title>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        try {
            const query = args.join(' ').trim();
            const { data } = await axios.get('https://api.jikan.moe/v4/manga', { params: { q: query, limit: 5 }, timeout: 15000 });
            const list = data?.data || [];
            if (!list.length) {
                return await sock.sendMessage(from, { text: `❌ No manga found for "${query}".` }, { quoted: message });
            }
            const text = list.map((m, i) => `${i + 1}. ${m.title}\n⭐ ${m.score || 'N/A'} | 📚 ${m.chapters || '?'} chapters`).join('\n\n');
            await sock.sendMessage(from, { text: `📖 Manga results:\n\n${text}` }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed: ${error.message}` }, { quoted: message });
        }
    }
};
