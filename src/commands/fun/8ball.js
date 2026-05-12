export default {
    name: '8ball', aliases: ['magic8'], category: 'fun',
    description: 'Ask the magic 8-ball a question', usage: '8ball <question>', cooldown: 3,
    async execute({ sock, message, args, from }) {
        const q = args.join(' ').trim();
        if (!q) return sock.sendMessage(from, { text: '❌ Usage: .8ball <question>' }, { quoted: message });
        const responses = ['Yes', 'No', 'Maybe', 'Definitely', 'Never', 'Ask again later', 'Absolutely', 'I doubt it', 'For sure', 'Not a chance', 'Signs point to yes', 'Very doubtful'];
        await sock.sendMessage(from, { text: `🎱 *Question:* ${q}\n\n*Answer:* ${responses[Math.floor(Math.random() * responses.length)]}` }, { quoted: message });
    }
};
