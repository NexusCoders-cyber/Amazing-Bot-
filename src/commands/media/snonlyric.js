import axios from 'axios';

export default {
    name: 'snonlyric',
    aliases: ['snonlyric', 'genlyrics'],
    category: 'media',
    description: 'Generate lyrics with SnonLyric AI',
    usage: 'snonlyric <prompt>',
    cooldown: 6,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        try {
            const prompt = args.join(' ').trim();
            if (!prompt) return await sock.sendMessage(from, { text: '❌ Usage: snonlyric <prompt>' }, { quoted: message });
            const { data } = await axios.get('https://arychauhann.onrender.com/api/snonlyric', {
                params: { prompt },
                timeout: 90000
            });
            const lyrics = data?.lyrics || data?.result || data?.text || data?.data || '';
            if (!lyrics) throw new Error('No lyrics generated');
            return await sock.sendMessage(from, { text: `🎵 Generated Lyrics\n\n${String(lyrics).replace(/\*/g, '')}` }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, { text: `❌ snonlyric failed: ${error.message}` }, { quoted: message });
        }
    }
};
