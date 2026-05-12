import axios from 'axios';

export default {
    name: 'morse',
    aliases: [],
    category: 'utility',
    description: 'Convert text to Morse code',
    usage: 'morse <text>',
    example: 'morse hello world',
    cooldown: 5,
    permissions: ['user'],
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) {
            await sock.sendMessage(from, { text: '❌ Usage: morse <text>' }, { quoted: message });
            return;
        }

        try {
            const { data } = await axios.get(`https://api.popcat.xyz/texttomorse?text=${encodeURIComponent(text)}`, { timeout: 15000 });
            await sock.sendMessage(from, { text: data?.morse || 'No result.' }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: '❌ Failed to convert to Morse.' }, { quoted: message });
        }
    }
};
