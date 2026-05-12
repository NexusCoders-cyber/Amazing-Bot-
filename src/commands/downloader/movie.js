import axios from 'axios';

function pickList(data) {
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
}

function pickTitle(it = {}) {
    return it.title || it.name || it.movie || it.drama || 'Unknown';
}

function pickUrl(it = {}) {
    return it.video || it.videoUrl || it.url || it.link || it.download || it.downloadUrl || null;
}

export default {
    name: 'movie',
    aliases: ['film', 'mv', 'moviedl'],
    category: 'downloader',
    description: 'Search movies and send selected item as file',
    usage: 'movie <moviebox|dramabox> <query>',
    args: true,
    minArgs: 2,

    async execute({ sock, message, from, args }) {
        const source = (args[0] || '').toLowerCase();
        const query = args.slice(1).join(' ').trim();

        if (!['moviebox', 'dramabox'].includes(source)) {
            return await sock.sendMessage(from, { text: '❌ Usage: movie <moviebox|dramabox> <query>' }, { quoted: message });
        }

        try {
            const api = `https://apiskeith.top/${source}/search?q=${encodeURIComponent(query)}`;
            const { data } = await axios.get(api, { timeout: 120000 });
            const list = pickList(data).slice(0, 10);
            if (!list.length) return await sock.sendMessage(from, { text: `❌ No result for ${query}` }, { quoted: message });

            const text = [
                `🎬 *${source} results*`,
                '',
                ...list.map((it, i) => {
                    const title = pickTitle(it);
                    const year = it.year || it.release || '';
                    return `${i + 1}. ${title}${year ? ` (${year})` : ''}`;
                }),
                '',
                'Reply with number to download as file.'
            ].join('\n');

            const sent = await sock.sendMessage(from, { text }, { quoted: message });
            if (!global.replyHandlers) global.replyHandlers = {};
            global.replyHandlers[sent.key.id] = {
                command: 'movie',
                handler: async (replyText, replyMessage) => {
                    const n = Number.parseInt(String(replyText || '').trim(), 10);
                    if (!n || n < 1 || n > list.length) return sock.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: replyMessage });
                    const pick = list[n - 1];
                    const url = pickUrl(pick);
                    if (!url) return sock.sendMessage(from, { text: '❌ Selected item has no downloadable video URL.' }, { quoted: replyMessage });

                    const safe = pickTitle(pick).replace(/[\\/:*?"<>|]/g, '').slice(0, 70) || 'movie';
                    return sock.sendMessage(from, {
                        document: { url },
                        mimetype: 'video/mp4',
                        fileName: `${safe}.mp4`,
                        caption: `🎬 ${pickTitle(pick)}`
                    }, { quoted: replyMessage });
                }
            };
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Movie failed: ${error.message}` }, { quoted: message });
        }
    }
};
