import axios from 'axios';

const APIS = {
    playersearch: q => `https://apiskeith.top/sport/playersearch?q=${encodeURIComponent(q)}`,
    teamsearch: q => `https://apiskeith.top/sport/teamsearch?q=${encodeURIComponent(q)}`,
    venuesearch: q => `https://apiskeith.top/sport/venuesearch?q=${encodeURIComponent(q)}`,
    gameevents: q => `https://apiskeith.top/sport/gameevents?q=${encodeURIComponent(q)}`,
    livescore: () => 'https://apiskeith.top/livescore',
    livescore2: () => 'https://apiskeith.top/livescore2',
    upcoming: () => 'https://apiskeith.top/epl/upcomingmatches',
    matches: () => 'https://apiskeith.top/epl/matches',
    bet: () => 'https://apiskeith.top/bet'
};

export default {
    name: 'sport',
    aliases: ['sports'],
    category: 'utility',
    description: 'Sports search/live info',
    usage: 'sport <playersearch|teamsearch|venuesearch|gameevents|livescore|livescore2|upcoming|matches|bet> [query]',
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const sub = (args[0] || '').toLowerCase();
        const q = args.slice(1).join(' ').trim();
        const fn = APIS[sub];
        if (!fn) return await sock.sendMessage(from, { text: '❌ Invalid sport subcommand.' }, { quoted: message });
        if (['playersearch', 'teamsearch', 'venuesearch', 'gameevents'].includes(sub) && !q) {
            return await sock.sendMessage(from, { text: `❌ Usage: sport ${sub} <query>` }, { quoted: message });
        }
        try {
            const { data } = await axios.get(fn(q), { timeout: 30000 });
            await sock.sendMessage(from, {
                text: `⚽ *${sub}*\n\n${JSON.stringify(data?.result ?? data?.data ?? data, null, 2).slice(0, 3500)}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Sport failed: ${error.message}` }, { quoted: message });
        }
    }
};
