import axios from 'axios';

export default {
    name: 'lyrics',
    aliases: ['lyric', 'songtext'],
    category: 'scraper',
    description: 'Fetch song lyrics by title and artist',
    usage: 'lyrics <song name> - <artist>',
    cooldown: 5,

    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) {
            return sock.sendMessage(from, { text: '🎵 *Lyrics*\n\nUsage:\n.lyrics Faded - Alan Walker\n.lyrics Godzilla' }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '📝', key: message.key } });

        try {
            // Try multiple sources
            let lyrics = null;
            let title = text;
            let artist = '';

            // Parse "song - artist" format
            const parts = text.split(/[-–—]/).map(s => s.trim());
            if (parts.length >= 2) {
                title = parts[0];
                artist = parts.slice(1).join(' ');
            }

            // Source 1: API
            try {
                const query = artist ? `${title} ${artist}` : title;
                const { data } = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist || title)}/${encodeURIComponent(title)}`, { timeout: 10000 });
                if (data?.lyrics) lyrics = data.lyrics;
            } catch {}

            // Source 2: Another API
            if (!lyrics) {
                try {
                    const { data } = await axios.get(`https://weeb-api.vercel.app/lyrics?name=${encodeURIComponent(text)}`, { timeout: 10000 });
                    if (data?.lyrics) lyrics = data.lyrics;
                    else if (data?.[0]?.lyrics) lyrics = data[0].lyrics;
                } catch {}
            }

            if (!lyrics) {
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(from, { text: `❌ Could not find lyrics for "${text}".` }, { quoted: message });
            }

            const lines = [`🎵 *${title}*${artist ? ` - ${artist}` : ''}`, '', lyrics.slice(0, 3900)];
            await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(from, { text: `❌ Lyrics fetch failed: ${error.message}` }, { quoted: message });
        }
    }
};
