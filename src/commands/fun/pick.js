export default {
    name: 'pick', aliases: ['choose', 'random'], category: 'fun',
    description: 'Randomly pick from a list of items', usage: 'pick item1, item2, item3',
    cooldown: 3,
    async execute({ sock, message, args, from }) {
        const items = args.join(' ').split(',').map(s => s.trim()).filter(Boolean);
        if (items.length < 2) return sock.sendMessage(from, { text: '❌ Provide at least 2 items separated by commas.\n.pick pizza, burger, sushi' }, { quoted: message });
        const pick = items[Math.floor(Math.random() * items.length)];
        await sock.sendMessage(from, { text: `🎯 *I pick:* ${pick}` }, { quoted: message });
    }
};
