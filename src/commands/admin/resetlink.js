export default {
    name: 'resetlink',
    aliases: ['revokegc'],
    category: 'admin',
    description: 'Reset/revoke current group invite link',
    usage: 'resetlink',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from }) {
        const code = await sock.groupRevokeInvite(from);
        await sock.sendMessage(from, { text: `✅ Group link reset.\n🔗 New link:\nhttps://chat.whatsapp.com/${code}` }, { quoted: message });
    }
};
