export default {
    name: 'broadcast',
    aliases: ['bc'],
    category: 'owner',
    description: 'Broadcast a message to all chats',
    usage: 'broadcast <message>',
    example: 'broadcast Bot will restart in 5 minutes',
    cooldown: 30,
    permissions: ['owner'],
    args: true,
    minArgs: 1,
    ownerOnly: true,

    async execute({ sock, message, from, args }) {
        const text = args.join(' ');
        if (!text) {
            return await sock.sendMessage(from, {
                text: 'Provide a message to broadcast.'
            }, { quoted: message });
        }

        const progressMsg = await sock.sendMessage(from, {
            text: 'Broadcasting...'
        }, { quoted: message });

        try {
            const chats = await sock.groupFetchAllParticipating();
            const groupIds = Object.keys(chats);

            let sent = 0;
            let failed = 0;

            for (const groupId of groupIds) {
                try {
                    await sock.sendMessage(groupId, { text });
                    sent++;
                    await new Promise(r => setTimeout(r, 500));
                } catch {
                    failed++;
                }
            }

            await sock.sendMessage(from, {
                text: `Broadcast complete.\nSent: ${sent}\nFailed: ${failed}`,
                edit: progressMsg.key
            });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `Broadcast failed: ${error.message}`,
                edit: progressMsg.key
            });
        }
    }
};
