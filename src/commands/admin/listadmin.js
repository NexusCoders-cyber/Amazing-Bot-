export default {
    name: 'listadmin',
    aliases: ['listadmins', 'adminlist'],
    category: 'admin',
    description: 'List all group admins',
    usage: 'listadmin',
    groupOnly: true,

    async execute({ sock, message, from }) {
        const meta = await sock.groupMetadata(from);
        const admins = (meta.participants || []).filter(p => p.admin);
        if (!admins.length) {
            return await sock.sendMessage(from, { text: 'No admins found.' }, { quoted: message });
        }
        const mentions = admins.map(a => a.id);
        const text = `👮 *Group Admins (${admins.length})*\n\n${admins.map((a, i) => `${i + 1}. @${a.id.split('@')[0]}`).join('\n')}`;
        await sock.sendMessage(from, { text, mentions }, { quoted: message });
    }
};
