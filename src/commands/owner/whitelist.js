import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WHITELIST_FILE = path.join(process.cwd(), 'cache', 'whitelist.json');

export function initWhitelist() {
    try {
        if (fs.existsSync(WHITELIST_FILE)) {
            const data = fs.readJsonSync(WHITELIST_FILE);
            return data;
        }
    } catch (error) {
        console.error('Error reading whitelist:', error);
    }
    
    const defaultWhitelist = {
        enabled: false,
        users: []
    };
    
    try {
        fs.ensureDirSync(path.dirname(WHITELIST_FILE));
        fs.writeJsonSync(WHITELIST_FILE, defaultWhitelist, { spaces: 2 });
    } catch (error) {
        console.error('Error creating whitelist file:', error);
    }
    
    return defaultWhitelist;
}

function saveWhitelist(data) {
    try {
        fs.ensureDirSync(path.dirname(WHITELIST_FILE));
        fs.writeJsonSync(WHITELIST_FILE, data, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('Error saving whitelist:', error);
        return false;
    }
}

export function isWhitelisted(jid, whitelistData) {
    if (!whitelistData || !whitelistData.enabled) return false;
    
    const userNumber = jid.split('@')[0].replace(/:\d+$/, '');
    return whitelistData.users.some(user => {
        const whitelistedNumber = user.split('@')[0].replace(/:\d+$/, '');
        return userNumber === whitelistedNumber;
    });
}

export function isOwner(jid, config) {
    const userNumber = jid.split('@')[0].replace(/:\d+$/, '');
    return config.ownerNumbers.some(ownerJid => {
        const ownerNumber = ownerJid.split('@')[0].replace(/:\d+$/, '');
        return userNumber === ownerNumber;
    });
}

export function isSudo(jid, config) {
    if (isOwner(jid, config)) return true;
    const userNumber = jid.split('@')[0].replace(/:\d+$/, '');
    return config.sudoers.some(sudoJid => {
        const sudoNumber = sudoJid.split('@')[0].replace(/:\d+$/, '');
        return userNumber === sudoNumber;
    });
}

export default {
    name: 'whitelist',
    aliases: ['wl', 'whitelist-mode'],
    category: 'owner',
    description: 'Manage bot whitelist mode - restrict bot usage to specific users',
    usage: 'whitelist <on|off|add|remove|list> [@user]',
    example: 'whitelist on\nwhitelist add @user\nwhitelist list',
    cooldown: 3,
    permissions: ['owner'],
    args: true,
    minArgs: 1,
    ownerOnly: true,

    async execute({ sock, message, args, from, sender }) {
        const action = args[0]?.toLowerCase();
        const whitelistData = initWhitelist();

        if (action === 'on' || action === 'enable') {
            if (whitelistData.enabled) {
                return await sock.sendMessage(from, {
                    text: '⚠️ *Whitelist Already Enabled*\n\nWhitelist mode is already active.'
                }, { quoted: message });
            }

            whitelistData.enabled = true;
            saveWhitelist(whitelistData);

            return await sock.sendMessage(from, {
                text: `✅ *Whitelist Mode Enabled*\n\n🔒 Bot is now in whitelist mode\n👥 Only whitelisted users can use the bot\n📋 Whitelisted users: ${whitelistData.users.length}\n\n💡 Use \`.whitelist add @user\` to add users`
            }, { quoted: message });
        }

        if (action === 'off' || action === 'disable') {
            if (!whitelistData.enabled) {
                return await sock.sendMessage(from, {
                    text: '⚠️ *Whitelist Already Disabled*\n\nWhitelist mode is not active.'
                }, { quoted: message });
            }

            whitelistData.enabled = false;
            saveWhitelist(whitelistData);

            return await sock.sendMessage(from, {
                text: `✅ *Whitelist Mode Disabled*\n\n🌐 Bot is now accessible to everyone\n📋 Whitelist still contains ${whitelistData.users.length} users (inactive)`
            }, { quoted: message });
        }

        if (action === 'add') {
            const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const quotedJid = message.message?.extendedTextMessage?.contextInfo?.participant;
            const targetJid = mentionedJid || quotedJid;

            if (!targetJid) {
                return await sock.sendMessage(from, {
                    text: '❌ *No User Specified*\n\nPlease mention or reply to a user to add them.\n\n*Example:* .whitelist add @user'
                }, { quoted: message });
            }

            if (whitelistData.users.includes(targetJid)) {
                return await sock.sendMessage(from, {
                    text: `⚠️ *Already Whitelisted*\n\n@${targetJid.split('@')[0]} is already in the whitelist.`,
                    contextInfo: { mentionedJid: [targetJid] }
                }, { quoted: message });
            }

            whitelistData.users.push(targetJid);
            saveWhitelist(whitelistData);

            return await sock.sendMessage(from, {
                text: `✅ *User Added to Whitelist*\n\n👤 @${targetJid.split('@')[0]} has been whitelisted\n📋 Total whitelisted: ${whitelistData.users.length}\n🔒 Whitelist mode: ${whitelistData.enabled ? 'Active' : 'Inactive'}`,
                contextInfo: { mentionedJid: [targetJid] }
            }, { quoted: message });
        }

        if (action === 'remove' || action === 'delete') {
            const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const quotedJid = message.message?.extendedTextMessage?.contextInfo?.participant;
            const targetJid = mentionedJid || quotedJid;

            if (!targetJid) {
                return await sock.sendMessage(from, {
                    text: '❌ *No User Specified*\n\nPlease mention or reply to a user to remove them.\n\n*Example:* .whitelist remove @user'
                }, { quoted: message });
            }

            const index = whitelistData.users.indexOf(targetJid);
            if (index === -1) {
                return await sock.sendMessage(from, {
                    text: `⚠️ *Not Whitelisted*\n\n@${targetJid.split('@')[0]} is not in the whitelist.`,
                    contextInfo: { mentionedJid: [targetJid] }
                }, { quoted: message });
            }

            whitelistData.users.splice(index, 1);
            saveWhitelist(whitelistData);

            return await sock.sendMessage(from, {
                text: `✅ *User Removed from Whitelist*\n\n👤 @${targetJid.split('@')[0]} has been removed\n📋 Total whitelisted: ${whitelistData.users.length}\n🔒 Whitelist mode: ${whitelistData.enabled ? 'Active' : 'Inactive'}`,
                contextInfo: { mentionedJid: [targetJid] }
            }, { quoted: message });
        }

        if (action === 'list') {
            if (whitelistData.users.length === 0) {
                return await sock.sendMessage(from, {
                    text: `📋 *Whitelist*\n\n🔒 Mode: ${whitelistData.enabled ? 'Active' : 'Inactive'}\n👥 Whitelisted users: None\n\n💡 Use \`.whitelist add @user\` to add users`
                }, { quoted: message });
            }

            let listText = `📋 *Whitelist*\n\n🔒 Mode: ${whitelistData.enabled ? 'Active' : 'Inactive'}\n👥 Whitelisted users (${whitelistData.users.length}):\n\n`;
            
            whitelistData.users.forEach((jid, index) => {
                listText += `${index + 1}. @${jid.split('@')[0]}\n`;
            });

            return await sock.sendMessage(from, {
                text: listText,
                contextInfo: { mentionedJid: whitelistData.users }
            }, { quoted: message });
        }

        return await sock.sendMessage(from, {
            text: `📋 *Whitelist Management*\n\n🔒 Current Status: ${whitelistData.enabled ? 'Active' : 'Inactive'}\n👥 Whitelisted Users: ${whitelistData.users.length}\n\n*Commands:*\n• \`.whitelist on\` - Enable whitelist mode\n• \`.whitelist off\` - Disable whitelist mode\n• \`.whitelist add @user\` - Add user to whitelist\n• \`.whitelist remove @user\` - Remove user\n• \`.whitelist list\` - View all whitelisted users\n\n💡 When enabled, only whitelisted users can use the bot`
        }, { quoted: message });
    }
};