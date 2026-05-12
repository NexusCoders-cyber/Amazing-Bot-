import axios from 'axios';

export default {
    name: 'tiktok', aliases: ['tt', 'tikdl'], category: 'scraper',
    description: 'Download TikTok videos without watermark', usage: 'tiktok <url>', cooldown: 10,
    async execute({ sock, message, args, from }) {
        const url = args.join(' ').trim();
        if (!url) return sock.sendMessage(from, { text: '❌ Usage: .tiktok <url>' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '🎵', key: message.key } });
        try {
            const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 20000 });
            if (data?.data?.play) {
                const info = data.data;
                await sock.sendMessage(from, {
                    video: { url: info.play },
                    caption: `🎵 *TikTok*\n👤 ${info.author?.nickname || 'Unknown'}\n📝 ${info.title || ''}\n❤️ ${info.digg_count || 0} | 💬 ${info.comment_count || 0}`
                }, { quoted: message });
            } else throw new Error('No video');
        } catch { await sock.sendMessage(from, { text: '❌ Failed. Try a different URL.' }, { quoted: message }); }
    }
};
