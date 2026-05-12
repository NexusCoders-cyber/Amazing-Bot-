export default {
    name: 'linkgc',
    aliases: ['grouplink'],
    category: 'admin',
    description: 'Get group invite link',
    usage: 'linkgc',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from }) {
        const code = await sock.groupInviteCode(from);
        await sock.sendMessage(from, { text: `🔗 Group Link:\nhttps://chat.whatsapp.com/${code}` }, { quoted: message });
    }
};
