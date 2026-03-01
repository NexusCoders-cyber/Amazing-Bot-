import config from '../../config.js';

export default {
    name: 'listsudo',
    aliases: ['sudolist', 'listowners'],
    category: 'owner',
    description: 'List all bot owners and sudo admins',
    usage: '.listsudo',
    cooldown: 3,
    ownerOnly: true,
    
    async execute({ sock, message, from }) {
        try {
            let listText = '👑 *BOT OWNERS & SUDO ADMINS*\n\n';
            
            listText += '╭──⦿【 👑 PRIMARY OWNERS 】\n';
            if (config.ownerNumbers && config.ownerNumbers.length > 0) {
                config.ownerNumbers.forEach((jid, index) => {
                    const number = jid.split('@')[0];
                    listText += `│ ${index + 1}. @${number}\n`;
                });
            } else {
                listText += '│ No primary owners configured\n';
            }
            listText += '╰────────⦿\n\n';
            
            listText += '╭──⦿【 🔐 SUDO ADMINS 】\n';
            if (config.sudoers && config.sudoers.length > 0) {
                config.sudoers.forEach((jid, index) => {
                    const number = jid.split('@')[0];
                    listText += `│ ${index + 1}. @${number}\n`;
                });
            } else {
                listText += '│ No sudo admins configured\n';
            }
            listText += '╰────────⦿\n\n';
            
            listText += '💡 *Permissions:*\n';
            listText += '• Primary owners have full access\n';
            listText += '• Sudo admins can use owner commands\n\n';
            listText += '📝 *Commands:*\n';
            listText += '• .addsudo @user - Add sudo admin\n';
            listText += '• .removesudo @user - Remove sudo admin';
            
            const allMentions = [
                ...(config.ownerNumbers || []),
                ...(config.sudoers || [])
            ];
            
            await sock.sendMessage(from, {
                text: listText,
                mentions: allMentions
            }, { quoted: message });
            
        } catch (error) {
            console.error('List sudo error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to list sudo admins.'
            }, { quoted: message });
        }
    }
};
