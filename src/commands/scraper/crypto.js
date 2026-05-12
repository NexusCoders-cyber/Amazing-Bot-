import axios from 'axios';

export default {
    name: 'crypto', aliases: ['coin', 'price'], category: 'scraper',
    description: 'Get live cryptocurrency prices', usage: 'crypto <coin>', cooldown: 5,
    async execute({ sock, message, args, from }) {
        const coin = args.join(' ').trim().toLowerCase() || 'bitcoin';
        try {
            const { data } = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=usd&include_24hr_change=true`, { timeout: 10000 });
            if (data[coin]) {
                const p = data[coin];
                const change = p.usd_24h_change;
                const arrow = change >= 0 ? '📈' : '📉';
                await sock.sendMessage(from, {
                    text: `${arrow} *${coin.toUpperCase()}*\n💰 $${p.usd?.toLocaleString() || 'N/A'}\n${change ? `24h: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : ''}`
                }, { quoted: message });
            } else throw new Error('Not found');
        } catch { await sock.sendMessage(from, { text: `❌ Coin "${coin}" not found. Try bitcoin, ethereum, dogecoin` }, { quoted: message }); }
    }
};
