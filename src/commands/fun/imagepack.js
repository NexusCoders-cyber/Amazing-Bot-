import axios from 'axios';

const COMMANDS = [
    'moe', 'aipic', 'hentai', 'bluearchive', 'boypic', 'carimage', 'random-girl', 'loli',
    'rwaifu', 'panda', 'bird', 'koala', 'animewlp', 'animeavatar'
];

const WAIFU_ACTION_MAP = {
    animewlp: 'waifu',
    animeavatar: 'waifu'
};

function getBody(message) {
    return message?.message?.conversation
        || message?.message?.extendedTextMessage?.text
        || message?.message?.imageMessage?.caption
        || message?.message?.videoMessage?.caption
        || '';
}

async function resolveImage(cmd) {
    if (cmd === 'dog') {
        const { data } = await axios.get('https://dog.ceo/api/breeds/image/random', { timeout: 15000 });
        return data?.message;
    }

    if (['panda', 'bird', 'koala'].includes(cmd)) {
        const animal = cmd === 'bird' ? 'birb' : cmd;
        const { data } = await axios.get(`https://some-random-api.com/animal/${animal}`, { timeout: 15000 });
        return data?.image || data?.link;
    }

    const endpoint = WAIFU_ACTION_MAP[cmd];
    if (endpoint) {
        const { data } = await axios.get(`https://apis.prexzyvilla.site/anime/${endpoint}`, { timeout: 20000 });
        const payload = data?.result || data?.data || data;
        return payload?.url || payload?.gif || payload?.video || payload?.image;
    }

    const { data } = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 15000 });
    return data?.url;
}

export default {
    name: 'moe',
    aliases: COMMANDS.filter(c => c !== 'moe'),
    category: 'fun',
    description: 'Random image bundle command',
    usage: 'moe',
    cooldown: 5,

    async execute({ sock, message, from, prefix }) {
        try {
            const body = getBody(message).trim();
            const invoked = body.startsWith(prefix)
                ? body.slice(prefix.length).split(/\s+/)[0].toLowerCase()
                : 'moe';
            const cmd = COMMANDS.includes(invoked) ? invoked : 'moe';
            const imageUrl = await resolveImage(cmd);

            if (!imageUrl) {
                return await sock.sendMessage(from, { text: '❌ Failed to fetch image URL.' }, { quoted: message });
            }

            if (/\.mp4(\?|$)/i.test(imageUrl) || cmd === 'tiktokgirl') {
                await sock.sendMessage(from, {
                    video: { url: imageUrl },
                    caption: `✨ ${cmd}`
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: `✨ ${cmd}`
                }, { quoted: message });
            }
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed: ${error.message}` }, { quoted: message });
        }
    }
};
