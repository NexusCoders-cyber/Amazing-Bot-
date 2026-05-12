import crypto from 'crypto';

export default {
    name: 'password',
    aliases: ['genpass', 'passgen'],
    category: 'utility',
    description: 'Generate secure random passwords',
    usage: 'password [length]',
    cooldown: 2,
    minArgs: 0,

    async execute({ sock, message, from, args }) {
        const length = Math.max(8, Math.min(64, Number.parseInt(args[0] || '16', 10) || 16));
        const raw = crypto.randomBytes(length * 2).toString('base64').replace(/[^a-zA-Z0-9!@#$%^&*()_+\-=[\]{}]/g, '');
        const password = raw.slice(0, length);
        return sock.sendMessage(from, {
            text: `🔐 Generated password (${length} chars):\n\`${password}\``
        }, { quoted: message });
    }
};
