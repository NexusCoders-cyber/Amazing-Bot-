import config from '../../config.js';
import fs from 'fs-extra';
import path from 'path';

const SUDO_FILE = path.join(process.cwd(), 'cache', 'sudoers.json');

async function loadSudoers() {
    try {
        await fs.ensureFile(SUDO_FILE);
        const content = await fs.readFile(SUDO_FILE, 'utf8');
        if (!content.trim()) return [];
        const data = JSON.parse(content);
        return data.sudoers || [];
    } catch (error) {
        return [];
    }
}

async function saveSudoers(sudoers) {
    await fs.ensureDir(path.dirname(SUDO_FILE));
    await fs.writeFile(SUDO_FILE, JSON.stringify({ sudoers }, null, 2), 'utf8');
    config.sudoers = sudoers;
}

export default {
    name: 'sudo',
    aliases: ['addadmin', 'makeadmin', 'botadmin'],
    category: 'owner',
    description: 'Add or remove bot admin users (reply to message or mention user)',
    usage: 'sudo add/remove [@user or reply]\nsudo list',
    example: 'sudo add @user\nsudo remove (reply to user message)\nsudo list',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, sender }) {
        try {
            const action = args[0]?.toLowerCase();
            
            if (!action || (action !== 'add' && action !== 'remove' && action !== 'list')) {
                return await sock.sendMessage(from, {
                    text: `❌ *Invalid Action*

Available actions:
• add - Add bot admin (reply or mention)
• remove - Remove bot admin (reply or mention)
• list - View all bot admins

*Usage:*
• .sudo add @user
• .sudo remove (reply to user)
• .sudo list`
                }, { quoted: message });
            }

            const sudoers = await loadSudoers();

            if (action === 'list') {
                if (sudoers.length === 0) {
                    return await sock.sendMessage(from, {
                        text: `📋 *Bot Admin List*

No bot admins configured.

Use \`.sudo add @user\` to add admins.

*Note:* Bot owners have all admin privileges by default.`
                    }, { quoted: message });
                }

                let listText = `📋 *Bot Admin List*

`;
                sudoers.forEach((admin, index) => {
                    const number = admin.replace('@s.whatsapp.net', '').replace('@c.us', '');
                    listText += `${index + 1}. @${number}\n`;
                });
                listText += `\n*Total:* ${sudoers.length} bot admin${sudoers.length > 1 ? 's' : ''}`;

                return await sock.sendMessage(from, {
                    text: listText,
                    mentions: sudoers
                }, { quoted: message });
            }

            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
            
            let targetJid = null;
            
            if (quotedMsg && quotedParticipant) {
                targetJid = quotedParticipant;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
            } else {
                return await sock.sendMessage(from, {
                    text: `❌ *No User Specified*

Please specify a user by:
• Replying to their message
• Mentioning them with @

*Usage:*
• .sudo add @user
• .sudo remove (reply to user message)`
                }, { quoted: message });
            }

            const targetNumber = targetJid.split('@')[0].replace(/:\d+/, '');
            const normalizedJid = `${targetNumber}@s.whatsapp.net`;

            if (action === 'add') {
                if (sudoers.includes(normalizedJid)) {
                    return await sock.sendMessage(from, {
                        text: `ℹ️ *Already Bot Admin*

@${targetNumber} is already a bot admin.

Use \`.sudo list\` to view all admins.`,
                        mentions: [normalizedJid]
                    }, { quoted: message });
                }

                const isOwner = config.ownerNumbers.some(owner => {
                    const ownerNum = owner.split('@')[0];
                    return ownerNum === targetNumber;
                });

                if (isOwner) {
                    return await sock.sendMessage(from, {
                        text: `ℹ️ *Already Owner*

@${targetNumber} is the bot owner and has all privileges automatically.

No need to add as bot admin.`,
                        mentions: [normalizedJid]
                    }, { quoted: message });
                }

                sudoers.push(normalizedJid);
                await saveSudoers(sudoers);

                await sock.sendMessage(from, {
                    text: `✅ *Bot Admin Added*

*User:* @${targetNumber}
*Added by:* @${sender.split('@')[0]}
*Date:* ${new Date().toLocaleString()}

@${targetNumber} now has bot admin privileges and can use owner commands.`,
                    mentions: [normalizedJid, sender]
                }, { quoted: message });

                try {
                    await sock.sendMessage(normalizedJid, {
                        text: `👑 *You Are Now Bot Admin*

*Added by:* @${sender.split('@')[0]}
*Date:* ${new Date().toLocaleString()}

You now have bot admin privileges. Use them responsibly!

Type \`.help owner\` to see available commands.`,
                        mentions: [sender]
                    });
                } catch (e) {}

            } else if (action === 'remove') {
                if (!sudoers.includes(normalizedJid)) {
                    return await sock.sendMessage(from, {
                        text: `ℹ️ *Not Bot Admin*

@${targetNumber} is not a bot admin.

Use \`.sudo list\` to view all admins.`,
                        mentions: [normalizedJid]
                    }, { quoted: message });
                }

                const updatedSudoers = sudoers.filter(s => s !== normalizedJid);
                await saveSudoers(updatedSudoers);

                await sock.sendMessage(from, {
                    text: `✅ *Bot Admin Removed*

*User:* @${targetNumber}
*Removed by:* @${sender.split('@')[0]}
*Date:* ${new Date().toLocaleString()}

@${targetNumber} no longer has bot admin privileges.`,
                    mentions: [normalizedJid, sender]
                }, { quoted: message });

                try {
                    await sock.sendMessage(normalizedJid, {
                        text: `⚠️ *Bot Admin Removed*

*Removed by:* @${sender.split('@')[0]}
*Date:* ${new Date().toLocaleString()}

Your bot admin privileges have been revoked.`,
                        mentions: [sender]
                    });
                } catch (e) {}
            }

        } catch (error) {
            console.error('Sudo command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*

Failed to update bot admin list.

*Error:* ${error.message}

Please try again.`
            }, { quoted: message });
        }
    }
};
