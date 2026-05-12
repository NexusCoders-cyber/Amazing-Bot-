import config from '../../config.js';
import { getUser } from '../../models/User.js';
import moment from 'moment';
import axios from 'axios';
import os from 'os';

const bootTime = Date.now();

function formatUptime(ms) {
    const sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function formatBytes(bytes = 0) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = Number(bytes) || 0;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i += 1;
    }
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function usageBar(used, total, size = 10) {
    const ratio = total > 0 ? Math.max(0, Math.min(1, used / total)) : 0;
    const fill = Math.round(ratio * size);
    return `[${'█'.repeat(fill)}${'░'.repeat(Math.max(0, size - fill))}] ${Math.round(ratio * 100)}%`;
}

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

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const { getAllCommands, getAllCategories, getCommandsByCategory, getCommand } = await import('../../utils/commandManager.js');
            
            const userData = await getUser(sender) || { name: 'Warrior', isPremium: false, xp: 0, economy: { balance: 0 } };
            const pushName = message.pushName || userData.name || 'Warrior';
            const userId = sender.split('@')[0];
            const userStatus = userData.isPremium ? '⚡ PREMIUM' : '🌟 FREE';
            const userCredits = userData.isPremium ? '∞' : `${userData.economy?.balance ?? 0} ZENI`;
            
            if (args.length > 0) {
                return this.showCommandDetails({ sock, message, from, commandName: args[0], prefix, sender, getCommand });
            }
            
            const allCommands = getAllCommands();
            const categories = getAllCategories();
            
            const now = moment();
            const currentDate = now.format('DD/MM/YYYY');
            const currentDay = now.format('dddd');
            const currentTime = now.format('hh:mm:ss A');
            const speedMs = (Number(process.hrtime.bigint() - process.hrtime.bigint()) / 1_000_000).toFixed(3);
            const ramUsed = process.memoryUsage().rss;
            const ramTotal = os.totalmem();
            const uptime = formatUptime(Date.now() - bootTime);
            
            const categoryMap = {
                'admin': '🛡️', 'ai': '🤖', 'downloader': '📥', 'economy': '💰',
                'fun': '🎭', 'games': '🎮', 'general': '📱', 'media': '🎨',
                'owner': '👑', 'utility': '🔧', 'moderation': '⚖️', 'music': '🎵',
                'social': '👥', 'info': '📊', 'misc': '⭐', 'search': '🔍',
                'anime': '🌸', 'tools': '🛠️', 'image': '🖼️', 'system': '⚙️', 'rank': '🏆',
                'bug': '💀', 'scraper': '🔎'
            };

            let helpMessage = `┏❐  ◈ ${(config.botName || 'ASTA BOT').toUpperCase()} ◈\n`;
            helpMessage += `┃ user : ${pushName}\n`;
            helpMessage += `┃ id : @${userId}\n`;
            helpMessage += `┃ owner : ${config.ownerName || 'Unknown'}\n`;
            helpMessage += `┃ mode : ${config.publicMode === false ? 'self' : 'public'}\n`;
            helpMessage += `┃ speed : ${speedMs} Ms\n`;
            helpMessage += `┃ prefix : [ ${prefix} ]\n`;
            helpMessage += `┃ uptime : ${uptime}\n`;
            helpMessage += `┃ version : ${config.botVersion || '1.0.0'}\n`;
            helpMessage += `┃ ram : ${usageBar(ramUsed, ramTotal)}\n`;
            helpMessage += `┃ status : ${userStatus}\n`;
            helpMessage += `┃ credits : ${userCredits}\n`;
            helpMessage += `┃ date : ${currentDate} (${currentDay})\n`;
            helpMessage += `┃ time : ${currentTime}\n`;
            helpMessage += `┗❐\n\n`;

            let cmdCount = 0;
            for (const category of categories.sort()) {
                const commands = getCommandsByCategory(category);
                if (!commands || commands.length === 0) continue;
                const emoji = categoryMap[category.toLowerCase()] || '⭐';
                helpMessage += `┏❐ 《 ${emoji} ${category.toUpperCase()} 》 ❐\n`;
                for (const cmd of commands.sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
                    helpMessage += `┣◆ ${prefix}${cmd.name}\n`;
                    cmdCount++;
                }
                helpMessage += `┗❐\n\n`;
            }

            helpMessage += `Total Commands: ${cmdCount}\n`;
            helpMessage += `Usage: ${prefix}help <command>\n`;
            helpMessage += `Support: ${prefix}support`;

            await sock.sendMessage(from, {
                image: { url: 'https://i.ibb.co/1YQKfrfC/afb92fba6b4e.jpg' },
                caption: helpMessage,
                mentions: [sender]
            }, { quoted: message });

            try {
                const songs = ['Love you by Amah', 'She Goes by Denver', 'anime lofi', 'night drive music'];
                const song = songs[Math.floor(Math.random() * songs.length)];
                const { data } = await axios.get(`https://apis.davidcyril.name.ng/play?query=${encodeURIComponent(song)}&apikey=`, { timeout: 20000 });
                if (data?.status && data?.result?.download_url) {
                    await sock.sendMessage(from, { 
                        audio: { url: data.result.download_url }, 
                        mimetype: 'audio/mpeg', 
                        ptt: false 
                    }, { quoted: message });
                }
            } catch {}

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Error: ${error.message}`
            }, { quoted: message });
        }
    },

    async showCommandDetails({ sock, message, from, commandName, prefix, sender, getCommand }) {
        const cmd = getCommand(commandName);
        if (!cmd) {
            return sock.sendMessage(from, {
                text: `❌ Command "${commandName}" not found.\nUse ${prefix}help to see all commands.`
            }, { quoted: message });
        }

        let info = `╭──⦿ 【 📋 COMMAND DETAILS 】\n`;
        info += `│ 🏷️ Name: ${cmd.name}\n`;
        info += `│ 🔄 Aliases: ${cmd.aliases && cmd.aliases.length ? cmd.aliases.join(', ') : 'None'}\n`;
        info += `│ 📖 Usage: ${prefix}${cmd.usage || cmd.name}\n`;
        info += `│ 📝 Description: ${cmd.description || 'No description'}\n`;
        info += `│ 📂 Category: ${cmd.category || 'Uncategorized'}\n`;
        info += `│ ⏱️ Cooldown: ${cmd.cooldown || 0}s\n`;
        info += `│ 🔒 Permissions: ${(cmd.permissions || ['user']).join(', ')}\n`;
        info += `│ 💎 Premium: ${cmd.premium ? 'Yes' : 'No'}\n`;
        info += `│ 👑 Owner Only: ${cmd.ownerOnly ? 'Yes' : 'No'}\n`;
        info += `╰────────⦿`;
        
        return sock.sendMessage(from, { text: info, mentions: [sender] }, { quoted: message });
    }
};
