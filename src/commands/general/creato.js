export default {
    name: 'creato', aliases: ['creator', 'ownerinfo'], category: 'general',
    description: 'Bot creator information', usage: 'creato', cooldown: 3,
    async execute({ sock, message, from }) {
        await sock.sendMessage(from, { text: `🤖 *Ilom Bot*\n\n👑 Creator: Ilom Dev\n📱 WA: 2349060245012\n💻 Version: 42.0\n\nPowered by Amazing Bot Engine` }, { quoted: message });
    }
};
