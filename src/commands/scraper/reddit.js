import axios from 'axios';

export default {
    name: 'reddit', aliases: ['subreddit'], category: 'scraper',
    description: 'Get hot posts from a subreddit', usage: 'reddit <subreddit>', cooldown: 10,
    async execute({ sock, message, args, from }) {
        const sub = args.join(' ').trim() || 'memes';
        await sock.sendMessage(from, { react: { text: '📱', key: message.key } });
        try {
            const { data } = await axios.get(`https://www.reddit.com/r/${encodeURIComponent(sub)}/hot.json?limit=5`, {
                timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const posts = data?.data?.children || [];
            if (!posts.length) return sock.sendMessage(from, { text: '❌ No posts found.' }, { quoted: message });
            let msg = `📱 *r/${sub}* - Hot Posts\n\n`;
            posts.slice(0, 5).forEach((p, i) => {
                const d = p.data;
                msg += `${i + 1}. ${d.title}\n👍 ${d.ups} | 💬 ${d.num_comments}\n${d.url}\n\n`;
            });
            await sock.sendMessage(from, { text: msg.slice(0, 4000) }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
