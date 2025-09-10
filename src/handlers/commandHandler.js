const fs = require('fs-extra');
const path = require('path');
const { Collection } = require('@whiskeysockets/baileys');
const config = require('../config');
const logger = require('../utils/logger');
const { getUser, updateUser } = require('../models/User');
const { getGroup, updateGroup } = require('../models/Group');
const { logCommand } = require('../models/Command');
const rateLimiter = require('../utils/rateLimiter');
const antiSpam = require('../utils/antiSpam');
const cache = require('../utils/cache');

class CommandHandler {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
        this.categories = new Map();
        this.cooldowns = new Map();
        this.commandStats = new Map();
        this.isInitialized = false;
    }

    async loadCommands() {
        if (this.isInitialized) return;
        
        const commandsPath = path.join(__dirname, '..', 'commands');
        const categories = await fs.readdir(commandsPath);
        
        let totalCommands = 0;
        
        for (const category of categories) {
            const categoryPath = path.join(commandsPath, category);
            const stat = await fs.stat(categoryPath);
            
            if (!stat.isDirectory()) continue;
            
            const commandFiles = (await fs.readdir(categoryPath))
                .filter(file => file.endsWith('.js'));
            
            this.categories.set(category, []);
            
            for (const file of commandFiles) {
                try {
                    const commandPath = path.join(categoryPath, file);
                    delete require.cache[require.resolve(commandPath)];
                    const command = require(commandPath);
                    
                    if (!command.name || !command.execute) {
                        logger.warn(`Command ${file} is missing name or execute function`);
                        continue;
                    }
                    
                    command.category = category;
                    command.filePath = commandPath;
                    
                    this.commands.set(command.name, command);
                    
                    if (command.aliases) {
                        for (const alias of command.aliases) {
                            this.aliases.set(alias, command.name);
                        }
                    }
                    
                    this.categories.get(category).push(command.name);
                    this.commandStats.set(command.name, { used: 0, errors: 0 });
                    
                    totalCommands++;
                    
                } catch (error) {
                    logger.error(`Failed to load command ${file}:`, error);
                }
            }
        }
        
        this.isInitialized = true;
        logger.info(`Loaded ${totalCommands} commands from ${categories.length} categories`);
    }

    async reloadCommand(commandName) {
        const command = this.commands.get(commandName) || 
                       this.commands.get(this.aliases.get(commandName));
        
        if (!command) return false;
        
        try {
            delete require.cache[require.resolve(command.filePath)];
            const newCommand = require(command.filePath);
            
            this.commands.delete(command.name);
            if (command.aliases) {
                for (const alias of command.aliases) {
                    this.aliases.delete(alias);
                }
            }
            
            newCommand.category = command.category;
            newCommand.filePath = command.filePath;
            
            this.commands.set(newCommand.name, newCommand);
            if (newCommand.aliases) {
                for (const alias of newCommand.aliases) {
                    this.aliases.set(alias, newCommand.name);
                }
            }
            
            logger.info(`Reloaded command: ${commandName}`);
            return true;
        } catch (error) {
            logger.error(`Failed to reload command ${commandName}:`, error);
            return false;
        }
    }

    getCommand(name) {
        return this.commands.get(name) || 
               this.commands.get(this.aliases.get(name));
    }

    getCommandsByCategory(category) {
        const categoryCommands = this.categories.get(category) || [];
        return categoryCommands.map(name => this.commands.get(name));
    }

    getAllCategories() {
        return Array.from(this.categories.keys());
    }

    getCommandCount() {
        return this.commands.size;
    }

    getCommandStats(commandName) {
        return this.commandStats.get(commandName) || { used: 0, errors: 0 };
    }

    async checkPermissions(command, user, group, isGroupAdmin, isBotAdmin) {
        if (!command.permissions || command.permissions.length === 0) return true;
        
        for (const permission of command.permissions) {
            switch (permission) {
                case 'owner':
                    if (config.ownerNumbers.includes(user.jid)) return true;
                    break;
                case 'admin':
                    if (config.ownerNumbers.includes(user.jid) || isGroupAdmin) return true;
                    break;
                case 'premium':
                    if (user.isPremium || config.ownerNumbers.includes(user.jid)) return true;
                    break;
                case 'group':
                    if (group) return true;
                    break;
                case 'private':
                    if (!group) return true;
                    break;
                case 'botAdmin':
                    if (isBotAdmin) return true;
                    break;
            }
        }
        
        return false;
    }

    async checkCooldown(commandName, userId) {
        const command = this.getCommand(commandName);
        if (!command?.cooldown) return true;
        
        const cooldownKey = `${commandName}_${userId}`;
        const lastUsed = this.cooldowns.get(cooldownKey);
        
        if (!lastUsed) {
            this.cooldowns.set(cooldownKey, Date.now());
            return true;
        }
        
        const timePassed = Date.now() - lastUsed;
        const cooldownTime = command.cooldown * 1000;
        
        if (timePassed < cooldownTime) {
            const timeLeft = Math.ceil((cooldownTime - timePassed) / 1000);
            return { success: false, timeLeft };
        }
        
        this.cooldowns.set(cooldownKey, Date.now());
        return true;
    }

    async validateArguments(command, args, sock, message) {
        if (command.args === false) return true;
        
        if (command.minArgs && args.length < command.minArgs) {
            await sock.sendMessage(message.key.remoteJid, {
                text: `❌ *Insufficient arguments*\n\n*Usage:* ${config.prefix}${command.usage || command.name}\n*Example:* ${command.example || `${config.prefix}${command.name}`}`
            });
            return false;
        }
        
        if (command.maxArgs && args.length > command.maxArgs) {
            await sock.sendMessage(message.key.remoteJid, {
                text: `❌ *Too many arguments*\n\n*Usage:* ${config.prefix}${command.usage || command.name}`
            });
            return false;
        }
        
        return true;
    }

    async handleCommand(sock, message, commandName, args) {
        try {
            const command = this.getCommand(commandName);
            if (!command) return false;
            
            const from = message.key.remoteJid;
            const sender = message.key.participant || from;
            const isGroup = from.endsWith('@g.us');
            
            const [user, group] = await Promise.all([
                getUser(sender),
                isGroup ? getGroup(from) : null
            ]);
            
            if (!user) {
                logger.warn(`User not found: ${sender}`);
                return false;
            }
            
            if (user.isBanned) {
                await sock.sendMessage(from, {
                    text: `❌ *You are banned from using this bot*\n\n*Reason:* ${user.banReason || 'No reason provided'}\n*Until:* ${user.banUntil || 'Permanent'}`
                });
                return true;
            }
            
            if (isGroup && group?.isBanned) {
                await sock.sendMessage(from, {
                    text: `❌ *This group is banned from using bot commands*\n\n*Reason:* ${group.banReason || 'No reason provided'}`
                });
                return true;
            }
            
            const isGroupAdmin = isGroup ? 
                (await sock.groupMetadata(from)).participants
                    .find(p => p.id === sender)?.admin !== undefined : false;
            
            const isBotAdmin = isGroup ? 
                (await sock.groupMetadata(from)).participants
                    .find(p => p.id === sock.user.id)?.admin !== undefined : false;
            
            const hasPermission = await this.checkPermissions(command, user, group, isGroupAdmin, isBotAdmin);
            if (!hasPermission) {
                await sock.sendMessage(from, {
                    text: `❌ *Access Denied*\n\nYou don't have permission to use this command.\n\n*Required:* ${command.permissions?.join(', ') || 'None'}`
                });
                return true;
            }
            
            if (isGroup && command.category === 'owner' && !config.ownerNumbers.includes(sender)) {
                await sock.sendMessage(from, {
                    text: `❌ *Owner Command*\n\nThis command can only be used by the bot owner in private chat.`
                });
                return true;
            }
            
            const cooldownCheck = await this.checkCooldown(commandName, sender);
            if (cooldownCheck.success === false) {
                await sock.sendMessage(from, {
                    text: `⏰ *Cooldown Active*\n\nPlease wait ${cooldownCheck.timeLeft} seconds before using this command again.`
                });
                return true;
            }
            
            const rateLimitCheck = await rateLimiter.checkLimit(sender, commandName);
            if (!rateLimitCheck.allowed) {
                await sock.sendMessage(from, {
                    text: `🚫 *Rate Limited*\n\nToo many requests. Try again in ${Math.ceil(rateLimitCheck.resetTime / 1000)} seconds.`
                });
                return true;
            }
            
            const spamCheck = await antiSpam.checkSpam(sender, message);
            if (spamCheck.isSpam) {
                await sock.sendMessage(from, {
                    text: `⚠️ *Anti-Spam Protection*\n\nSlow down! Wait ${spamCheck.waitTime} seconds.`
                });
                return true;
            }
            
            const argsValid = await this.validateArguments(command, args, sock, message);
            if (!argsValid) return true;
            
            if (command.typing !== false) {
                await sock.sendPresenceUpdate('composing', from);
            }
            
            const startTime = Date.now();
            
            await command.execute({
                sock,
                message,
                args,
                command: commandName,
                user,
                group,
                from,
                sender,
                isGroup,
                isGroupAdmin,
                isBotAdmin,
                prefix: config.prefix
            });
            
            const executionTime = Date.now() - startTime;
            
            const stats = this.commandStats.get(command.name);
            stats.used++;
            this.commandStats.set(command.name, stats);
            
            await Promise.all([
                logCommand(sender, commandName, from, isGroup, executionTime),
                updateUser(sender, { $inc: { commandsUsed: 1 } }),
                isGroup ? updateGroup(from, { $inc: { commandsUsed: 1 } }) : Promise.resolve()
            ]);
            
            if (executionTime > 5000) {
                logger.warn(`Slow command execution: ${commandName} took ${executionTime}ms`);
            }
            
            cache.set(`lastCommand_${sender}`, {
                command: commandName,
                timestamp: Date.now(),
                executionTime
            }, 300);
            
            return true;
            
        } catch (error) {
            logger.error(`Command execution error [${commandName}]:`, error);
            
            const stats = this.commandStats.get(commandName);
            if (stats) {
                stats.errors++;
                this.commandStats.set(commandName, stats);
            }
            
            await sock.sendMessage(message.key.remoteJid, {
                text: `❌ *Command Error*\n\nAn error occurred while executing this command.\n\n*Command:* ${commandName}\n*Error:* ${error.message || 'Unknown error'}`
            });
            
            return true;
        } finally {
            await sock.sendPresenceUpdate('paused', message.key.remoteJid);
        }
    }

    async getHelpMessage(category = null, user = null) {
        const isOwner = user && config.ownerNumbers.includes(user.jid);
        const isPremium = user?.isPremium || isOwner;
        
        if (category) {
            const commands = this.getCommandsByCategory(category)
                .filter(cmd => {
                    if (cmd.hidden && !isOwner) return false;
                    if (cmd.premium && !isPremium) return false;
                    if (cmd.ownerOnly && !isOwner) return false;
                    return true;
                });
            
            if (commands.length === 0) {
                return `❌ No commands found in category: ${category}`;
            }
            
            let helpText = `╭─「 *${category.toUpperCase()} COMMANDS* 」\n`;
            
            commands.forEach(cmd => {
                const usage = cmd.usage || cmd.name;
                const desc = cmd.description || 'No description';
                helpText += `├ ${config.prefix}${usage}\n├   ${desc}\n├\n`;
            });
            
            helpText += `╰────────────────\n\n*Total:* ${commands.length} commands`;
            return helpText;
        }
        
        const categories = this.getAllCategories()
            .filter(cat => {
                const commands = this.getCommandsByCategory(cat);
                return commands.some(cmd => {
                    if (cmd.hidden && !isOwner) return false;
                    if (cmd.premium && !isPremium) return false;
                    if (cmd.ownerOnly && !isOwner) return false;
                    return true;
                });
            });
        
        let helpText = `╭─「 *${config.botName || 'ILOM BOT'} MENU* 」\n`;
        helpText += `├ *Version:* ${config.botVersion || '1.0.0'}\n`;
        helpText += `├ *Prefix:* ${config.prefix}\n`;
        helpText += `├ *Commands:* ${this.getCommandCount()}\n`;
        helpText += `├ *Categories:* ${categories.length}\n`;
        helpText += `╰────────────────\n\n`;
        
        categories.forEach(category => {
            const commands = this.getCommandsByCategory(category)
                .filter(cmd => !cmd.hidden || isOwner)
                .filter(cmd => !cmd.premium || isPremium)
                .filter(cmd => !cmd.ownerOnly || isOwner);
            
            if (commands.length > 0) {
                helpText += `*${category.toUpperCase()}* (${commands.length})\n`;
                helpText += `${config.prefix}help ${category}\n\n`;
            }
        });
        
        helpText += `*Usage:* ${config.prefix}help [category]\n`;
        helpText += `*Example:* ${config.prefix}help fun\n\n`;
        helpText += `_🧠 Amazing Bot 🧠 v1 created by Ilom_`;
        
        return helpText;
    }

    getTopCommands(limit = 10) {
        return Array.from(this.commandStats.entries())
            .sort((a, b) => b[1].used - a[1].used)
            .slice(0, limit)
            .map(([name, stats]) => ({ name, ...stats }));
    }

    async searchCommands(query, user = null) {
        const isOwner = user && config.ownerNumbers.includes(user.jid);
        const isPremium = user?.isPremium || isOwner;
        
        const results = [];
        
        for (const [name, command] of this.commands) {
            if (command.hidden && !isOwner) continue;
            if (command.premium && !isPremium) continue;
            if (command.ownerOnly && !isOwner) continue;
            
            const searchText = `${name} ${command.description || ''} ${command.aliases?.join(' ') || ''}`.toLowerCase();
            
            if (searchText.includes(query.toLowerCase())) {
                results.push({
                    name,
                    category: command.category,
                    description: command.description || 'No description',
                    usage: command.usage || name
                });
            }
        }
        
        return results;
    }
}

const commandHandler = new CommandHandler();

module.exports = {
    commandHandler,
    loadCommands: () => commandHandler.loadCommands(),
    getCommand: (name) => commandHandler.getCommand(name),
    handleCommand: (sock, message, commandName, args) => 
        commandHandler.handleCommand(sock, message, commandName, args),
    getCommandCount: () => commandHandler.getCommandCount(),
    reloadCommand: (name) => commandHandler.reloadCommand(name),
    getHelpMessage: (category, user) => commandHandler.getHelpMessage(category, user),
    searchCommands: (query, user) => commandHandler.searchCommands(query, user),
    getTopCommands: (limit) => commandHandler.getTopCommands(limit),
    getAllCategories: () => commandHandler.getAllCategories(),
    getCommandsByCategory: (category) => commandHandler.getCommandsByCategory(category)
};