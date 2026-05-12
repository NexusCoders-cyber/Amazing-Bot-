import config from '../../config.js';
import { getSessionControl, toPhoneJid } from '../../utils/sessionControl.js';

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
            const sessionControl = await getSessionControl(sock);
            let listText = '👑 *BOT OWNERS & SUDO ADMINS*\n\n';
            
            listText += '╭──⦿【 👑 PRIMARY OWNERS 】\n';
            if (sessionControl.owners && sessionControl.owners.length > 0) {
                sessionControl.owners.forEach((number, index) => {
                    listText += `│ ${index + 1}. @${number}\n`;
                });
            } else {
                listText += '│ No primary owners configured\n';
            }
            listText += '╰────────⦿\n\n';
            
            listText += '╭──⦿【 🔐 SUDO ADMINS 】\n';
            if (sessionControl.sudoers && sessionControl.sudoers.length > 0) {
                sessionControl.sudoers.forEach((number, index) => {
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
                ...(sessionControl.owners || []).map(toPhoneJid),
                ...(sessionControl.sudoers || []).map(toPhoneJid)
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
