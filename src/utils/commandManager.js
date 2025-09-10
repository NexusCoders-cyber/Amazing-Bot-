const fs = require('fs-extra');
const path = require('path');
const { Collection } = require('@whiskeysockets/baileys');
const logger = require('./logger');
const { commandHandler } = require('../handlers/commandHandler');

class CommandManager {
    constructor() {
        this.loadedCommands = new Map();
        this.commandCategories = new Map();
        this.aliases = new Map();
        this.disabledCommands = new Set();
        this.commandUsage = new Map();
        this.isInitialized = false;
    }

    async initializeCommands() {
        if (this.isInitialized) return;

        try {
            await this.loadAllCommands();
            await this.validateCommands();
            await this.setupCommandWatchers();
            
            this.isInitialized = true;
            logger.info(`Command manager initialized with ${this.loadedCommands.size} commands`);
        } catch (error) {
            logger.error('Command manager initialization failed:', error);
            throw error;
        }
    }

    async loadAllCommands() {
        const commandsPath = path.join(__dirname, '..', 'commands');
        const categories = await this.getCommandCategories();

        for (const category of categories) {
            await this.loadCommandCategory(category);
        }
    }

    async getCommandCategories() {
        const commandsPath = path.join(__dirname, '..', 'commands');
        const entries = await fs.readdir(commandsPath, { withFileTypes: true });
        
        return entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
    }

    async loadCommandCategory(category) {
        const categoryPath = path.join(__dirname, '..', 'commands', category);
        
        if (!await fs.pathExists(categoryPath)) {
            await this.createCategoryStructure(category);
            return;
        }

        const commandFiles = (await fs.readdir(categoryPath))
            .filter(file => file.endsWith('.js'));

        this.commandCategories.set(category, []);

        for (const file of commandFiles) {
            await this.loadCommand(category, file);
        }
    }

    async loadCommand(category, filename) {
        try {
            const commandPath = path.join(__dirname, '..', 'commands', category, filename);
            
            delete require.cache[require.resolve(commandPath)];
            const command = require(commandPath);
            
            if (!this.validateCommandStructure(command)) {
                logger.warn(`Invalid command structure: ${filename}`);
                return false;
            }

            command.category = category;
            command.filename = filename;
            command.filepath = commandPath;
            command.lastModified = (await fs.stat(commandPath)).mtime;

            this.loadedCommands.set(command.name, command);
            this.commandCategories.get(category).push(command.name);

            if (command.aliases) {
                command.aliases.forEach(alias => {
                    this.aliases.set(alias, command.name);
                });
            }

            this.commandUsage.set(command.name, {
                used: 0,
                lastUsed: null,
                errors: 0,
                avgExecutionTime: 0
            });

            return true;
        } catch (error) {
            logger.error(`Failed to load command ${filename}:`, error);
            return false;
        }
    }

    validateCommandStructure(command) {
        const required = ['name', 'execute'];
        const optional = ['aliases', 'category', 'description', 'usage', 'example', 'cooldown', 'permissions', 'args'];

        for (const field of required) {
            if (!command[field]) {
                return false;
            }
        }

        if (typeof command.execute !== 'function') {
            return false;
        }

        return true;
    }

    async validateCommands() {
        const duplicateNames = new Set();
        const duplicateAliases = new Set();
        const nameMap = new Map();

        for (const [name, command] of this.loadedCommands) {
            if (nameMap.has(name)) {
                duplicateNames.add(name);
            }
            nameMap.set(name, command);

            if (command.aliases) {
                for (const alias of command.aliases) {
                    if (nameMap.has(alias) || this.aliases.has(alias)) {
                        duplicateAliases.add(alias);
                    }
                }
            }
        }

        if (duplicateNames.size > 0) {
            logger.warn('Duplicate command names found:', Array.from(duplicateNames));
        }

        if (duplicateAliases.size > 0) {
            logger.warn('Duplicate command aliases found:', Array.from(duplicateAliases));
        }
    }

    async createCategoryStructure(category) {
        const categoryPath = path.join(__dirname, '..', 'commands', category);
        await fs.ensureDir(categoryPath);

        const templateCommand = this.generateCommandTemplate(category);
        const templatePath = path.join(categoryPath, 'template.js');
        
        await fs.writeFile(templatePath, templateCommand);
        logger.info(`Created template for category: ${category}`);
    }

    generateCommandTemplate(category) {
        return `module.exports = {
    name: 'template_${category}',
    aliases: [],
    category: '${category}',
    description: 'Template command for ${category} category',
    usage: 'template_${category}',
    example: 'template_${category}',
    cooldown: 3,
    permissions: [],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: true,
    ownerOnly: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        await sock.sendMessage(from, {
            text: \`🔧 *Template Command - ${category.toUpperCase()}*

This is a template command for the ${category} category.
Replace this code with your command implementation.

*Category:* ${category}
*User:* @\${sender.split('@')[0]}
*Group:* \${isGroup ? 'Yes' : 'No'}

_Template command - Delete this file after creating real commands._\`,
            contextInfo: {
                mentionedJid: [sender]
            }
        });
    }
};`;
    }

    async reloadCommand(commandName) {
        try {
            const command = this.getCommand(commandName);
            if (!command) return false;

            const success = await this.loadCommand(command.category, command.filename);
            
            if (success) {
                logger.info(`Reloaded command: ${commandName}`);
                return true;
            }

            return false;
        } catch (error) {
            logger.error(`Failed to reload command ${commandName}:`, error);
            return false;
        }
    }

    async reloadCategory(category) {
        try {
            const commands = this.getCommandsByCategory(category);
            let reloadedCount = 0;

            for (const command of commands) {
                this.loadedCommands.delete(command.name);
                
                if (command.aliases) {
                    command.aliases.forEach(alias => {
                        this.aliases.delete(alias);
                    });
                }
            }

            this.commandCategories.set(category, []);
            
            await this.loadCommandCategory(category);
            reloadedCount = this.commandCategories.get(category).length;

            logger.info(`Reloaded category ${category}: ${reloadedCount} commands`);
            return reloadedCount;
        } catch (error) {
            logger.error(`Failed to reload category ${category}:`, error);
            return 0;
        }
    }

    async reloadAllCommands() {
        try {
            this.loadedCommands.clear();
            this.commandCategories.clear();
            this.aliases.clear();

            await this.loadAllCommands();
            await this.validateCommands();

            logger.info(`Reloaded all commands: ${this.loadedCommands.size} total`);
            return this.loadedCommands.size;
        } catch (error) {
            logger.error('Failed to reload all commands:', error);
            return 0;
        }
    }

    getCommand(name) {
        return this.loadedCommands.get(name) || this.loadedCommands.get(this.aliases.get(name));
    }

    getCommandsByCategory(category) {
        const commandNames = this.commandCategories.get(category) || [];
        return commandNames.map(name => this.loadedCommands.get(name)).filter(Boolean);
    }

    getAllCommands() {
        return Array.from(this.loadedCommands.values());
    }

    getAllCategories() {
        return Array.from(this.commandCategories.keys());
    }

    enableCommand(commandName) {
        this.disabledCommands.delete(commandName);
        logger.info(`Enabled command: ${commandName}`);
        return true;
    }

    disableCommand(commandName) {
        this.disabledCommands.add(commandName);
        logger.info(`Disabled command: ${commandName}`);
        return true;
    }

    isCommandEnabled(commandName) {
        return !this.disabledCommands.has(commandName);
    }

    getDisabledCommands() {
        return Array.from(this.disabledCommands);
    }

    recordCommandUsage(commandName, executionTime, success = true) {
        const usage = this.commandUsage.get(commandName);
        if (!usage) return;

        usage.used++;
        usage.lastUsed = new Date();
        
        if (success) {
            usage.avgExecutionTime = (usage.avgExecutionTime + executionTime) / 2;
        } else {
            usage.errors++;
        }

        this.commandUsage.set(commandName, usage);
    }

    getCommandStats(commandName) {
        return this.commandUsage.get(commandName);
    }

    getTopCommands(limit = 10) {
        return Array.from(this.commandUsage.entries())
            .sort((a, b) => b[1].used - a[1].used)
            .slice(0, limit)
            .map(([name, stats]) => ({ name, ...stats }));
    }

    getMostErrorProneCommands(limit = 10) {
        return Array.from(this.commandUsage.entries())
            .filter(([name, stats]) => stats.errors > 0)
            .sort((a, b) => b[1].errors - a[1].errors)
            .slice(0, limit)
            .map(([name, stats]) => ({ name, ...stats }));
    }

    getSlowestCommands(limit = 10) {
        return Array.from(this.commandUsage.entries())
            .filter(([name, stats]) => stats.avgExecutionTime > 0)
            .sort((a, b) => b[1].avgExecutionTime - a[1].avgExecutionTime)
            .slice(0, limit)
            .map(([name, stats]) => ({ name, ...stats }));
    }

    searchCommands(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const command of this.loadedCommands.values()) {
            const searchText = `${command.name} ${command.description || ''} ${command.aliases?.join(' ') || ''}`.toLowerCase();
            
            if (searchText.includes(lowerQuery)) {
                results.push(command);
            }
        }

        return results;
    }

    getCommandInfo(commandName) {
        const command = this.getCommand(commandName);
        if (!command) return null;

        const usage = this.getCommandStats(commandName);
        
        return {
            name: command.name,
            category: command.category,
            description: command.description,
            aliases: command.aliases || [],
            permissions: command.permissions || [],
            cooldown: command.cooldown || 0,
            usage: command.usage,
            example: command.example,
            premium: command.premium || false,
            hidden: command.hidden || false,
            ownerOnly: command.ownerOnly || false,
            lastModified: command.lastModified,
            stats: usage
        };
    }

    async setupCommandWatchers() {
        if (process.env.HOT_RELOAD !== 'true') return;

        const chokidar = require('chokidar');
        const commandsPath = path.join(__dirname, '..', 'commands');

        const watcher = chokidar.watch(commandsPath, {
            ignored: /node_modules/,
            persistent: true,
            ignoreInitial: true
        });

        watcher.on('change', async (filePath) => {
            const relativePath = path.relative(commandsPath, filePath);
            const parts = relativePath.split(path.sep);
            
            if (parts.length === 2 && parts[1].endsWith('.js')) {
                const category = parts[0];
                const filename = parts[1];
                const commandName = path.basename(filename, '.js');
                
                logger.info(`Hot reloading command: ${commandName}`);
                await this.loadCommand(category, filename);
            }
        });

        watcher.on('add', async (filePath) => {
            const relativePath = path.relative(commandsPath, filePath);
            const parts = relativePath.split(path.sep);
            
            if (parts.length === 2 && parts[1].endsWith('.js')) {
                const category = parts[0];
                const filename = parts[1];
                
                logger.info(`New command detected: ${filename}`);
                await this.loadCommand(category, filename);
            }
        });

        logger.info('Command hot reload watcher started');
    }

    generateCommandHelp(commandName) {
        const command = this.getCommand(commandName);
        if (!command) return null;

        const stats = this.getCommandStats(commandName);
        const isDisabled = !this.isCommandEnabled(commandName);

        return `📋 *Command Information*

*Name:* ${command.name}
*Category:* ${command.category}
*Description:* ${command.description || 'No description available'}
*Usage:* ${command.usage || command.name}
*Example:* ${command.example || `${command.name}`}
*Aliases:* ${command.aliases?.join(', ') || 'None'}
*Cooldown:* ${command.cooldown || 0} seconds
*Permissions:* ${command.permissions?.join(', ') || 'None'}
*Premium Only:* ${command.premium ? 'Yes' : 'No'}
*Owner Only:* ${command.ownerOnly ? 'Yes' : 'No'}
*Status:* ${isDisabled ? '❌ Disabled' : '✅ Enabled'}

📊 *Statistics:*
*Times Used:* ${stats?.used || 0}
*Errors:* ${stats?.errors || 0}
*Avg Execution:* ${Math.round(stats?.avgExecutionTime || 0)}ms
*Last Used:* ${stats?.lastUsed ? stats.lastUsed.toLocaleString() : 'Never'}`;
    }

    getSystemStats() {
        const totalCommands = this.loadedCommands.size;
        const enabledCommands = totalCommands - this.disabledCommands.size;
        const categories = this.commandCategories.size;
        const totalAliases = this.aliases.size;
        
        const usageStats = Array.from(this.commandUsage.values());
        const totalUsage = usageStats.reduce((sum, stat) => sum + stat.used, 0);
        const totalErrors = usageStats.reduce((sum, stat) => sum + stat.errors, 0);

        return {
            totalCommands,
            enabledCommands,
            disabledCommands: this.disabledCommands.size,
            categories,
            totalAliases,
            totalUsage,
            totalErrors,
            errorRate: totalUsage > 0 ? (totalErrors / totalUsage * 100).toFixed(2) : 0
        };
    }
}

const commandManager = new CommandManager();

module.exports = {
    commandManager,
    initializeCommands: () => commandManager.initializeCommands(),
    getCommand: (name) => commandManager.getCommand(name),
    getAllCommands: () => commandManager.getAllCommands(),
    getCommandsByCategory: (category) => commandManager.getCommandsByCategory(category),
    getAllCategories: () => commandManager.getAllCategories(),
    reloadCommand: (name) => commandManager.reloadCommand(name),
    reloadCategory: (category) => commandManager.reloadCategory(category),
    reloadAllCommands: () => commandManager.reloadAllCommands(),
    enableCommand: (name) => commandManager.enableCommand(name),
    disableCommand: (name) => commandManager.disableCommand(name),
    isCommandEnabled: (name) => commandManager.isCommandEnabled(name),
    searchCommands: (query) => commandManager.searchCommands(query),
    getCommandInfo: (name) => commandManager.getCommandInfo(name),
    getSystemStats: () => commandManager.getSystemStats(),
    recordCommandUsage: (name, time, success) => commandManager.recordCommandUsage(name, time, success),
    getTopCommands: (limit) => commandManager.getTopCommands(limit),
    generateCommandHelp: (name) => commandManager.generateCommandHelp(name)
};