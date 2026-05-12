export default {
    name: 'qrcode',
    aliases: ['qr'],
    category: 'utility',
    description: 'Generate a QR code from text',
    usage: 'qrcode <text>',
    args: true,
    minArgs: 1,
    cooldown: 5,

    async execute({ sock, message, from, args }) {
        const data = args.join(' ').trim();
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
        await sock.sendMessage(from, { image: { url }, caption: '✅ QR generated' }, { quoted: message });
    }
};
