export default {
    name: 'cekid', aliases: ['cekidc', 'checkid'], category: 'utility',
    description: 'Check ID info of replied user', usage: 'cekid (reply to user)', cooldown: 3,
    async execute({ sock, message, from }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo || {};
        const target = ctx?.participant || ctx?.mentionedJid?.[0] || message.key.participant || message.key.remoteJid;
        const name = await sock.getName(target).catch(() => 'Unknown');
        await sock.sendMessage(from, { text: `📋 *ID Info*\n\n📛 Name: ${name}\n📍 JID: ${target}\n🔢 LID: ${target.split('@')[0]}` }, { quoted: message });
    }
};
