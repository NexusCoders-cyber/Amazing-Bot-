import axios from 'axios';

export default {
    name: 'instagram', aliases: ['ig', 'igdl'], category: 'scraper',
    description: 'Download Instagram posts, reels, and stories', usage: 'instagram <url>', cooldown: 10,
    async execute({ sock, message, args, from }) {
        const url = args.join(' ').trim();
        if (!url) return sock.sendMessage(from, { text: '❌ Usage: .instagram <url>' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '📸', key: message.key } });
        try {
            const { data } = await axios.get(`https://www.instagrammm.com/api/instagrammm/v1/post/info?url=${encodeURIComponent(url)}`, {
                timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (data?.result?.urls?.length) {
                for (const u of data.result.urls.slice(0, 5)) {
                    await sock.sendMessage(from, { video: { url: u }, caption: '📸 Instagram' }, { quoted: message });
                }
            } else throw new Error('No media');
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
