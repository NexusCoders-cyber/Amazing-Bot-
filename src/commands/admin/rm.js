export default {
    name: 'rm',
    aliases: ['del'],
    category: 'admin',
    description: 'Delete a replied message (admins can delete anyone, others only bot/self)',
    usage: 'rm (reply to message)',
    cooldown: 2,
    async execute({ sock, message, from, isGroupAdmin, isOwner, isSudo }) {
        const ctx = message?.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        const stanzaId = ctx?.stanzaId;
        const participant = ctx?.participant || from;
        if (!quoted || !stanzaId) return sock.sendMessage(from, { text: '❌ Reply to a message you want to delete.' }, { quoted: message });

        const privileged = isOwner || isSudo || isGroupAdmin;
        const isBotMsg = participant === sock.user?.id;
        const isOwnMsg = participant === (message.key?.participant || message.key?.remoteJid);
        if (!privileged && !isBotMsg && !isOwnMsg) {
            return sock.sendMessage(from, { text: '❌ You can only delete your own messages or bot messages.' }, { quoted: message });
        }

        await sock.sendMessage(from, { delete: { remoteJid: from, id: stanzaId, participant } }).catch(() => {});
    }
};
