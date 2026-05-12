export default {
    name: 'roll', aliases: ['dice'], category: 'fun',
    description: 'Roll a dice (1-6)', usage: 'roll', cooldown: 2,
    async execute({ sock, message, from }) {
        const result = Math.floor(Math.random() * 6) + 1;
        const dice = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        await sock.sendMessage(from, { text: `🎲 ${dice[result - 1]} ${result}` }, { quoted: message });
    }
};
