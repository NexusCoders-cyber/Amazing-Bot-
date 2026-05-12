import axios from 'axios';

const SOURCES = [
    'https://arychauhann.onrender.com/api/sfmhentai',
    'https://arychauhann.onrender.com/api/hentai'
];

async function fetchVideoUrl(url) {
    const { data } = await axios.get(url, { timeout: 45000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return data?.video || data?.url || data?.result?.url || data?.data?.url || data?.data?.video || null;
}

async function fetchChoices(limit = 3) {
    const picks = [];
    const seen = new Set();

    for (let round = 0; round < limit; round += 1) {
        let pickedUrl = null;
        let pickedSource = '';

        for (const source of SOURCES) {
            try {
                const candidate = await fetchVideoUrl(source);
                if (candidate && !seen.has(candidate)) {
                    pickedUrl = candidate;
                    pickedSource = source;
                    break;
                }
            } catch {}
        }

        if (pickedUrl) {
            seen.add(pickedUrl);
            picks.push({
                index: picks.length + 1,
                url: pickedUrl,
                source: pickedSource
            });
        }
    }

    return picks;
}

export default {
    name: 'anivid',
    aliases: ['hentaivid', 'animevid'],
    category: 'ai',
    description: 'Fetch 3 anime video options and let user choose one',
    usage: 'anivid',
    cooldown: 8,

    async execute({ sock, message, from }) {
        const choices = await fetchChoices(3);

        if (!choices.length) {
            return sock.sendMessage(from, { text: '❌ Failed to fetch video from API sources.' }, { quoted: message });
        }

        if (choices.length === 1) {
            return sock.sendMessage(from, {
                video: { url: choices[0].url },
                caption: `✅ anivid\nsource: ${choices[0].source}`
            }, { quoted: message });
        }

        const menu = [
            '🎬 *Anivid Results*',
            '',
            ...choices.map((choice) => `${choice.index}. Video ${choice.index}`),
            '',
            'Reply with 1, 2, or 3 to choose your video.'
        ].join('\n');

        const sent = await sock.sendMessage(from, { text: menu }, { quoted: message });
        if (!global.replyHandlers) global.replyHandlers = {};

        global.replyHandlers[sent.key.id] = {
            command: 'anivid',
            handler: async (replyText, replyMessage) => {
                const n = Number.parseInt(String(replyText || '').trim(), 10);
                if (!n || n < 1 || n > choices.length) {
                    return sock.sendMessage(from, { text: `❌ Reply with a valid number between 1 and ${choices.length}.` }, { quoted: replyMessage });
                }

                const pick = choices[n - 1];
                return sock.sendMessage(from, {
                    video: { url: pick.url },
                    caption: `✅ anivid choice ${n}\nsource: ${pick.source}`
                }, { quoted: replyMessage });
            }
        };

        return null;
    }
};
