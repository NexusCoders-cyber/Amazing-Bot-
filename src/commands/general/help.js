import config from '../../config.js';
import { getUser } from '../../models/User.js';
import moment from 'moment';
import fetch from 'node-fetch';

export default {
    name: 'help',
    aliases: ['h', 'commands'],
    category: 'general',
    description: 'Get a list of all commands or info about a specific command',
    usage: 'help [command]',
    example: 'help\nhelp ping',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const { getAllCommands, getAllCategories, getCommandsByCategory, getCommand } = await import('../../utils/commandManager.js');
            
            const userData = await getUser(sender) || {
                name: 'Warrior',
                isPremium: false,
                xp: 0,
                economy: { balance: 0 }
            };
            
            const pushName = message.pushName || userData.name || 'Warrior';
            const userId = sender.split('@')[0];
            const userLevel = Math.floor((userData.xp ?? 0) / 1000) + 1;
            const userStatus = userData.isPremium ? '⚡ PREMIUM ELITE' : '🌟 FREE SAIYAN';
            const userPower = userData.isPremium ? '♾️ UNLIMITED ACCESS' : '⚔️ BASE FORM';
            const userCredits = userData.isPremium ? '∞ INFINITE' : `${userData.economy?.balance ?? 0} ZENI`;
            
            if (args.length > 0) {
                return this.showCommandDetails({ sock, message, from, commandName: args[0], prefix, sender, getCommand });
            }
            
            const allCommands = getAllCommands();
            const categories = getAllCategories();
            const totalCommands = allCommands.length;
            
            const now = moment();
            const currentDate = now.format('DD/MM/YYYY');
            const currentDay = now.format('dddd');
            const currentTime = now.format('hh:mm:ss A');
            
            const categoryMap = {
                'admin': '🛡️', 'ai': '🤖', 'downloader': '📥', 'economy': '💰',
                'fun': '🎭', 'games': '🎮', 'general': '📱', 'media': '🎨',
                'owner': '👑', 'utility': '🔧', 'moderation': '⚖️', 'music': '🎵',
                'social': '👥', 'info': '📊', 'misc': '⭐', 'search': '🔍',
                'anime': '🌸', 'tools': '🛠️', 'image': '🖼️', 'system': '⚙️', 'rank': '🏆'
            };

            let helpMessage = `╭──⦿【 ⚡ ${config.botName.toUpperCase()} 】\n`;
            helpMessage += `│ 🎯 𝗨𝘀𝗲𝗿: ${pushName}\n`;
            helpMessage += `│ 🔰 𝗜𝗗: @${userId}\n`;
            helpMessage += `│ 👑 𝗦𝘁𝗮𝘁𝘂𝘀: ${userStatus}\n`;
            helpMessage += `│ ⚡ 𝗣𝗼𝘄𝗲𝗿: ${userPower}\n`;
            helpMessage += `│ 💎 𝗖𝗿𝗲𝗱𝗶𝘁𝘀: ${userCredits}\n`;
            helpMessage += `│ 🌐 𝗣𝗿𝗲𝗳𝗶𝘅: ${prefix}\n`;
            helpMessage += `│ 🤖 𝗦𝘆𝘀𝘁𝗲𝗺: ${config.botName} v${config.botVersion}\n`;
            helpMessage += `│ 👨‍💻 𝗖𝗿𝗲𝗮𝘁𝗼𝗿: ${config.ownerName}\n`;
            helpMessage += `│ 🔄 𝗦𝘁𝗮𝘁𝘂𝘀: ONLINE & ACTIVE\n`;
            helpMessage += `│ 📅 𝗗𝗮𝘁𝗲: ${currentDate}\n`;
            helpMessage += `│ 📆 𝗗𝗮𝘆: ${currentDay}\n`;
            helpMessage += `│ ⏰ 𝗧𝗶𝗺𝗲: ${currentTime}\n`;
            helpMessage += `╰────────⦿\n`;

            for (const category of categories.sort()) {
                const commands = getCommandsByCategory(category);
                if (commands.length === 0) continue;
                
                const emoji = categoryMap[category.toLowerCase()] || '⭐';
                
                helpMessage += `\n╭──⦿【 ${emoji} ${category.toUpperCase()} 】\n`;
                
                const commandsInRow = [];
                commands.forEach(cmd => {
                    commandsInRow.push(`✧${cmd.name}`);
                });
                
                for (let i = 0; i < commandsInRow.length; i += 6) {
                    const row = commandsInRow.slice(i, i + 6).join(' ');
                    helpMessage += `│ ${row}\n`;
                }
                
                helpMessage += `╰────────⦿`;
            }

            helpMessage += `\n\n╭──────────⦿\n`;
            helpMessage += `│ 𝗧𝗼𝘁𝗮𝗹 𝗰𝗺𝗱𝘀:「${totalCommands}」\n`;
            helpMessage += `│ 𝗧𝘆𝗽𝗲: [ ${prefix}help <cmd> ]\n`;
            helpMessage += `│ 𝘁𝗼 𝗹𝗲𝗮𝗿𝗻 𝘁𝗵𝗲 𝘂𝘀𝗮𝗴𝗲.\n`;
            helpMessage += `│ 𝗧𝘆𝗽𝗲: [ ${prefix}support ] to join\n`;
            helpMessage += `│ Support Group\n`;
            helpMessage += `╰─────────────⦿\n`;
            helpMessage += `╭─────────────⦿\n`;
            helpMessage += `│💫 | [ ${config.botName} 🍀 ]\n`;
            helpMessage += `╰────────────⦿`;

            try {
                const apiResponse = await fetch('https://api.waifu.pics/sfw/waifu', { timeout: 5000 });
                const apiData = await apiResponse.json();
                const imgUrl = apiData.url;
                
                await sock.sendMessage(from, {
                    image: { url: imgUrl },
                    caption: helpMessage,
                    mentions: [sender]
                }, { quoted: message });
            } catch (error) {
                await sock.sendMessage(from, {
                    text: helpMessage,
                    mentions: [sender]
                }, { quoted: message });
            }
        } catch (error) {
            logger.error('Help command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Error loading help menu: ${error.message}`
            }, { quoted: message });
        }
    },

    async showCommandDetails({ sock, message, from, commandName, prefix, sender, getCommand }) {
        const cmd = getCommand(commandName);
        
        if (!cmd) {
            return sock.sendMessage(from, {
                text: `╭──⦿【 ❌ COMMAND ERROR 】\n│ Command "${commandName}" not found\n│ Use ${prefix}help to see all commands\n╰────────⦿`
            }, { quoted: message });
        }

        let info = `╭──⦿【 📋 COMMAND DETAILS 】\n`;
        info += `│ 🏷️ 𝗡𝗮𝗺𝗲: ${cmd.name}\n`;
        info += `│ 🔄 𝗔𝗹𝗶𝗮𝘀𝗲𝘀: ${cmd.aliases && cmd.aliases.length ? cmd.aliases.join(', ') : 'None'}\n`;
        info += `│ 📖 𝗨𝘀𝗮𝗴𝗲: ${prefix}${cmd.usage || cmd.name}\n`;
        info += `│ 📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻: ${cmd.description || 'No description provided'}\n`;
        info += `│ 📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${cmd.category || 'Uncategorized'}\n`;
        info += `│ ⏱️ 𝗖𝗼𝗼𝗹𝗱𝗼𝘄𝗻: ${cmd.cooldown || 0}s\n`;
        info += `│ 🔒 𝗣𝗲𝗿𝗺𝗶𝘀𝘀𝗶𝗼𝗻𝘀: ${(cmd.permissions || ['user']).join(', ')}\n`;
        info += `│ 💎 𝗣𝗿𝗲𝗺𝗶𝘂𝗺: ${cmd.premium ? 'Yes' : 'No'}\n`;
        info += `│ 👑 𝗢𝘄𝗻𝗲𝗿 𝗢𝗻𝗹𝘆: ${cmd.ownerOnly ? 'Yes' : 'No'}\n`;
        info += `╰────────⦿\n`;
        info += `╭─────────────⦿\n`;
        info += `│💫 | [ ${config.botName} 🍀 ] - Command Analysis\n`;
        info += `╰────────────⦿`;
        
        return sock.sendMessage(from, {
            text: info,
            mentions: [sender]
        }, { quoted: message });
    }
};