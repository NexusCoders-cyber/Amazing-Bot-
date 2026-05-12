import axios from 'axios';

function extractSummary(wikiExtract) {
    if (!wikiExtract) return '';
    const sentences = wikiExtract.match(/[^.!?]+[.!?]+/g) || [wikiExtract];
    return sentences.slice(0, 3).join(' ').trim();
}

async function fetchWikipediaBio(name) {
    for (const suffix of ['', ' (footballer)', ' (soccer player)', ' (athlete)']) {
        try {
            const { data } = await axios.get(
                'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(name + suffix),
                { timeout: 10000, headers: { 'User-Agent': 'AstaBot/1.0' } }
            );
            if (data?.extract) {
                return {
                    bio: extractSummary(data.extract),
                    url: data.content_urls?.desktop?.page || '',
                    thumbnail: data.thumbnail?.source || ''
                };
            }
        } catch {}
    }
    return null;
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return dateStr; }
}

function calcAge(dateStr) {
    if (!dateStr) return '';
    try {
        const birth = new Date(dateStr);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return ` (${age} years)`;
    } catch { return ''; }
}

export default {
    name: 'player',
    aliases: ['footballer', 'athlete', 'soccerplayer'],
    category: 'utility',
    description: 'Get player biography, honors and stats',
    usage: 'player <name>',
    example: 'player Lionel Messi',
    cooldown: 5,
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const query = args.join(' ').trim();
        if (!query) {
            return await sock.sendMessage(from, {
                text: '⚽ *Player Info*\n\nUsage: `.player <name>`\nExample: `.player Cristiano Ronaldo`'
            }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });

        try {
            // Search player via API
            const { data: searchData } = await axios.get(
                `https://apiskeith.top/sport/playersearch?q=${encodeURIComponent(query)}`,
                { timeout: 15000 }
            );

            const players = searchData?.result;
            if (!players?.length) throw new Error(`Player "${query}" not found.`);

            const player = players[0];

            // Fetch Wikipedia bio
            const wiki = await fetchWikipediaBio(player.name);

            // Fetch honors from TheSportsDB
            let honors = [];
            try {
                const { data: hData } = await axios.get(
                    `https://www.thesportsdb.com/api/v1/json/3/lookuphonours.php?id=${player.id}`,
                    { timeout: 10000 }
                );
                if (hData?.honours) honors = hData.honours;
            } catch {}

            // Build response
            const lines = [
                `⚽ *${player.name}*`,
                '',
                `🏟️ Team: ${player.team || 'N/A'}`,
                `🌍 Nationality: ${player.nationality || 'N/A'}`,
                `🎯 Position: ${player.position || 'N/A'}`,
                `📅 Born: ${formatDate(player.birthDate)}${calcAge(player.birthDate)}`,
                `📊 Status: ${player.status || 'N/A'}`
            ];

            // Add honors/trophies
            if (honors.length) {
                const grouped = {};
                for (const h of honors) {
                    const name = h.strHonour || '';
                    const season = h.strSeason || '';
                    if (!grouped[name]) grouped[name] = [];
                    if (season && !grouped[name].includes(season)) grouped[name].push(season);
                }

                const topHonors = Object.entries(grouped).slice(0, 12);
                if (topHonors.length) {
                    lines.push('', `🏆 *Honors/Trophies (${honors.length} total):*`);
                    for (const [honor, seasons] of topHonors) {
                        const s = seasons.join(', ');
                        lines.push(`  • ${honor}${s ? ` (${s})` : ''}`);
                    }
                    if (Object.keys(grouped).length > 12) {
                        lines.push(`  ... and ${Object.keys(grouped).length - 12} more`);
                    }
                }
            }

            if (wiki?.bio) {
                lines.push('', `📖 *Biography:*`, wiki.bio);
            }

            if (wiki?.url) {
                lines.push('', `📚 Wikipedia: ${wiki.url}`);
            }

            const caption = lines.join('\n');
            const imageUrl = player.cutout || player.thumbnail || wiki?.thumbnail || '';

            if (imageUrl) {
                await sock.sendMessage(from, {
                    image: { url: imageUrl },
                    caption
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, { text: caption }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (e) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(from, {
                text: `❌ ${e.message}`
            }, { quoted: message });
        }
    }
};
