export default {
    name: 'mesinf', aliases: ['msginfo', 'messageinfo'], category: 'utility',
    description: 'Get info about replied message', usage: 'mesinf (reply to msg)', cooldown: 3,
    async execute({ sock, message, from }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo || {};
        const quoted = ctx?.quotedMessage;
        if (!quoted) return sock.sendMessage(from, { text: '❌ Reply to a message.' }, { quoted: message });
        const type = Object.keys(quoted)[0];
        const sender = ctx?.participant || 'Unknown';
        await sock.sendMessage(from, { text: `📄 *Message Info*\n\n👤 From: ${sender}\n📦 Type: ${type}\n🆔 ID: ${message.message?.extendedTextMessage?.contextInfo?.stanzaId || 'N/A'}` }, { quoted: message });
    }
};
