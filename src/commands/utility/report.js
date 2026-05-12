import { getDeveloperNumbers, getPrimaryTopOwner } from '../../utils/privilegedUsers.js';

function normalizeNumber(jid = '') {
    return String(jid).replace(/[^\d]/g, '');
}

export default {
    name: 'report',
    aliases: ['bugreport', 'devreport'],
    category: 'utility',
    description: 'Send report to developers; dev can reply back through bot',
    usage: 'report <message>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const body = args.join(' ').trim();
        const senderNum = sender.split('@')[0];
        const topOwner = getPrimaryTopOwner();
        if (!topOwner) {
            return await sock.sendMessage(from, { text: '❌ Top owner is not configured.' }, { quoted: message });
        }
        const topOwnerJid = `${topOwner}@s.whatsapp.net`;
        const sent = await sock.sendMessage(topOwnerJid, {
            text: `📩 *User Report*\nFrom: @${senderNum}\nChat: ${from}\n\n${body}`,
            mentions: [sender]
        }, { quoted: message });

        if (!global.replyHandlers) global.replyHandlers = {};
        global.replyHandlers[sent.key.id] = {
            command: 'report',
            handler: async (replyText, replyMessage) => {
                const replySender = (replyMessage.key.participant || replyMessage.key.remoteJid || '').split('@')[0];
                if (!getDeveloperNumbers().includes(replySender)) return;
                await sock.sendMessage(from, {
                    text: `👨‍💻 *Developer Reply*\n\n${replyText}`
                });
            }
        };

        await sock.sendMessage(from, { text: '✅ Report sent to top owner.' }, { quoted: message });
    }
};
