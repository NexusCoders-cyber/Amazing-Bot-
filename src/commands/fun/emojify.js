export default {
    name: 'emojify', aliases: ['emotext'], category: 'fun',
    description: 'Convert text to regional indicator emojis', usage: 'emojify <text>', cooldown: 2,
    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) return sock.sendMessage(from, { text: '❌ Usage: .emojify <text>' }, { quoted: message });
        const letters = text.toLowerCase().split('').map(c => {
            if (c.match(/[a-z]/)) return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 97);
            if (c === ' ') return '  ';
            return c;
        });
        await sock.sendMessage(from, { text: letters.join(' ') }, { quoted: message });
    }
};
