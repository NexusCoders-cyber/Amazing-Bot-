import axios from 'axios';
export default {
    name: 'news', aliases: ['headlines'], category: 'fun',
    description: 'Get latest news headlines', usage: 'news [topic]', cooldown: 15,
    async execute({ sock, message, args, from }) {
        const topic = args.join(' ').trim() || 'latest';
        await sock.sendMessage(from, { react: { text: '📰', key: message.key } });
        try {
            const { data } = await axios.get(`https://gnews.io/api/v4/search?q=${encodeURIComponent(topic)}&lang=en&max=5&token=YOUR_KEY`, { timeout: 10000 });
            if (data?.articles?.length) {
                let msg = `📰 *News: ${topic}*\n\n`;
                data.articles.slice(0, 5).forEach((a, i) => msg += `${i + 1}. ${a.title}\n${a.source?.name || ''}\n${a.url}\n\n`);
                await sock.sendMessage(from, { text: msg.slice(0, 4000) }, { quoted: message });
            } else throw new Error('No news');
        } catch { await sock.sendMessage(from, { text: `📰 *Latest Headlines*\n\nCheck: https://news.google.com/search?q=${encodeURIComponent(topic)}` }, { quoted: message }); }
    }
};
