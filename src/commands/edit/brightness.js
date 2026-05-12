export default {
    name: 'brightness', aliases: ['bright'], category: 'edit',
    description: 'Adjust image brightness (reply to image)', usage: 'brightness', cooldown: 5,
    async execute({ sock, message, from }) {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.imageMessage?.url) return sock.sendMessage(from, { text: '❌ Reply to an image.' }, { quoted: message });
        await sock.sendMessage(from, { text: '🎨 Edit feature coming soon. Try .blur for now.' }, { quoted: message });
    }
};
