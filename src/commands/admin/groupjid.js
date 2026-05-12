export default {
    name: 'groupjid',
    aliases: ['gjid'],
    category: 'admin',
    description: 'Show current group JID',
    usage: 'groupjid',
    groupOnly: true,

    async execute({ sock, message, from }) {
        await sock.sendMessage(from, { text: `🆔 Group JID:\n${from}` }, { quoted: message });
    }
};
