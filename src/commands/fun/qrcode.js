import axios from 'axios';
export default {
    name: 'qrcode', aliases: ['qr'], category: 'fun',
    description: 'Generate a QR code from text', usage: 'qrcode <text>',
    cooldown: 5,
    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) return sock.sendMessage(from, { text: '❌ Usage: .qrcode <text>' }, { quoted: message });
        try {
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;
            await sock.sendMessage(from, { image: { url }, caption: `📱 QR Code for: ${text}` }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
