export default {
    name: 'produk', aliases: ['product', 'produkbot'], category: 'general',
    description: 'Bot product/package info', usage: 'produk', cooldown: 3,
    async execute({ sock, message, from }) {
        await sock.sendMessage(from, { text: `🛒 *Ilom Bot Packages*\n\n1. Premium - Unlock all bug commands\n2. Source Code - Full bot source\n\nContact: 2349060245012` }, { quoted: message });
    }
};
