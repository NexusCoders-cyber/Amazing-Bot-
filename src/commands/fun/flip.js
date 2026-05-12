export default {
    name: 'flip', aliases: ['coin'], category: 'fun',
    description: 'Flip a coin', usage: 'flip', cooldown: 2,
    async execute({ sock, message, from }) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        await sock.sendMessage(from, { text: `🪙 *${result}*` }, { quoted: message });
    }
};
