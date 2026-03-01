import fs from 'fs-extra';
import path from 'path';
import config from '../../config.js';

export default {
    name: 'removesudo',
    aliases: ['removeowner', 'delsudo'],
    category: 'owner',
    description: 'Remove a sudo admin',
    usage: '.removesudo @user',
    example: '.removesudo @1234567890',
    cooldown: 5,
    ownerOnly: true,
    
    async execute({ sock, message, from, sender }) {
        try {
            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            
            let targetJid = null;
            
            if (mentioned && mentioned.length > 0) {
                targetJid = mentioned[0];
            } else if (quotedUser) {
                targetJid = quotedUser;
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Usage*\n\nPlease mention or reply to a user to remove from sudo admins.\n\n*Usage:* .removesudo @user'
                }, { quoted: message });
            }
            
            const phoneNumber = targetJid.split('@')[0].replace(/:\d+/, '');
            const normalizedJid = `${phoneNumber}@s.whatsapp.net`;
            
            if (config.ownerNumbers.includes(normalizedJid)) {
                return await sock.sendMessage(from, {
                    text: `⚠️ *Cannot Remove*\n\n@${phoneNumber} is a primary bot owner and cannot be removed via this command.`,
                    mentions: [normalizedJid]
                }, { quoted: message });
            }
            
            if (!config.sudoers.includes(normalizedJid)) {
                return await sock.sendMessage(from, {
                    text: `ℹ️ *Not a Sudo*\n\n@${phoneNumber} is not a sudo admin.`,
                    mentions: [normalizedJid]
                }, { quoted: message });
            }
            
            const envPath = path.join(process.cwd(), '.env');
            let envContent = '';
            
            if (await fs.pathExists(envPath)) {
                envContent = await fs.readFile(envPath, 'utf8');
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ *Error*\n\n.env file not found.'
                }, { quoted: message });
            }
            
            const lines = envContent.split('\n');
            const sudoLineIndex = lines.findIndex(line => line.startsWith('SUDO_NUMBERS='));
            
            if (sudoLineIndex !== -1) {
                const currentSudos = lines[sudoLineIndex].split('=')[1] || '';
                let sudoList = currentSudos.split(',').filter(s => s.trim());
                
                sudoList = sudoList.filter(num => num.trim() !== phoneNumber);
                
                lines[sudoLineIndex] = `SUDO_NUMBERS=${sudoList.join(',').trim()}`;
                
                await fs.writeFile(envPath, lines.join('\n'), 'utf8');
                
                const index = config.sudoers.indexOf(normalizedJid);
                if (index > -1) {
                    config.sudoers.splice(index, 1);
                }
                
                await sock.sendMessage(from, {
                    text: `✅ *Sudo Admin Removed*\n\n👤 *User:* @${phoneNumber}\n📝 *Removed from:* .env file\n\n💡 This user can no longer use owner commands.\n\n⚠️ *Note:* Restart the bot for full effect.`,
                    mentions: [normalizedJid]
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, {
                    text: '❌ *Error*\n\nSUDO_NUMBERS not found in .env file.'
                }, { quoted: message });
            }
            
        } catch (error) {
            console.error('Remove sudo error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to remove sudo admin. Please try again.'
            }, { quoted: message });
        }
    }
};
