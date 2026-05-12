export default {
    name: 'reverse', aliases: ['rev'], category: 'fun',
    description: 'Reverse text', usage: 'reverse <text>', cooldown: 2,
    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) return sock.sendMessage(from, { text: '❌ Usage: .reverse <text>' }, { quoted: message });
        await sock.sendMessage(from, { text: `🔁 ${text.split('').reverse().join('')}` }, { quoted: message });
    }
};
