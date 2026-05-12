import yts from 'yt-search';

export default {
    name: 'ytsearch',
    aliases: ['yts'],
    category: 'downloader',
    description: 'Search YouTube and return text results',
    usage: 'ytsearch <query>',
    args: true,
    minArgs: 1,
    cooldown: 5,

    async execute({ sock, message, from, args }) {
        try {
            const query = args.join(' ').trim();
            const data = await yts(query);
            const videos = (data?.videos || []).slice(0, 5);
            if (!videos.length) {
                return await sock.sendMessage(from, { text: `❌ No results for "${query}".` }, { quoted: message });
            }
            const text = videos.map((v, i) => `${i + 1}. ${v.title}\n⏱️ ${v.timestamp} | 👤 ${v.author?.name || 'Unknown'}\n🔗 ${v.url}`).join('\n\n');
            await sock.sendMessage(from, { text: `🔍 *YouTube results for:* ${query}\n\n${text}` }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Search failed: ${error.message}` }, { quoted: message });
        }
    }
};
