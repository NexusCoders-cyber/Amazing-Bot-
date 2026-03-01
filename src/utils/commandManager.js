import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
            this.isInitialized = true;
            logger.info(`Command manager initialized with ${this.loadedCommands.size} commands`);
        } catch (error) {
            logger.error('Command manager initialization failed:', error);
            throw error;
        }
    }

    async loadAllCommands() {
        const commandsPath = path.join(__dirname, '..', 'commands');
        let entries;
        try {
            entries = await fs.readdir(commandsPath, { withFileTypes: true });
        } catch {
            logger.warn('Commands directory not found, skipping command load');
            return;
        }
        const categories = entries.filter(e => e.isDirectory()).map(e => e.name);
        for (const category of categories) {
            await this.loadCommandCategory(category);
        }
    }

    async loadCommandCategory(category) {
        const categoryPath = path.join(__dirname, '..', 'commands', category);
        if (!await fs.pathExists(categoryPath)) return;

        let commandFiles;
        try {
            commandFiles = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.js'));
        } catch {
            return;
        }

        if (!this.commandCategories.has(category)) {
            this.commandCategories.set(category, []);
        }

        for (const file of commandFiles) {
            await this.loadCommand(category, file);
        }
    }

    async loadCommand(category, filename) {
        try {
            const commandPath = path.join(__dirname, '..', 'commands', category, filename);
            const commandUrl = `file://${commandPath}?t=${Date.now()}`;
            const commandModule = await import(commandUrl);
            const command = commandModule.default;

            if (!command?.name || typeof command?.execute !== 'function') {
                logger.warn(`Invalid command structure: ${filename}`);
                return false;
            }

            const commandData = {
                ...command,
                category,
                filename,
                filepath: commandPath
            };

            this.loadedCommands.set(command.name, commandData);

            if (!this.commandCategories.has(category)) {
                this.commandCategories.set(category, []);
            }
            const catCmds = this.commandCategories.get(category);
            if (!catCmds.includes(command.name)) {
                catCmds.push(command.name);
            }

            if (command.aliases) {
                for (const alias of command.aliases) {
                    this.aliases.set(alias, command.name);
                }
            }

            if (!this.commandUsage.has(command.name)) {
                this.commandUsage.set(command.name, { used: 0, lastUsed: null, errors: 0, avgExecutionTime: 0 });
            }

            return true;
        } catch (error) {
            logger.error(`Failed to load command ${filename}: ${error.message}`);
            return false;
        }
    }

    async reloadCommand(commandName) {
        const command = this.getCommand(commandName);
        if (!command) return false;
        const catCmds = this.commandCategories.get(command.category) || [];
        const idx = catCmds.indexOf(command.name);
        if (idx > -1) catCmds.splice(idx, 1);
        this.loadedCommands.delete(command.name);
        if (command.aliases) {
            for (const alias of command.aliases) this.aliases.delete(alias);
        }
        return await this.loadCommand(command.category, command.filename);
    }

    async reloadCategory(category) {
        const commands = this.getCommandsByCategory(category);
        for (const cmd of commands) {
            this.loadedCommands.delete(cmd.name);
            if (cmd.aliases) {
                for (const alias of cmd.aliases) this.aliases.delete(alias);
            }
        }
        this.commandCategories.set(category, []);
        await this.loadCommandCategory(category);
        return this.commandCategories.get(category)?.length || 0;
    }

    async reloadAllCommands() {
        this.loadedCommands.clear();
        this.commandCategories.clear();
        this.aliases.clear();
        this.isInitialized = false;
        await this.initializeCommands();
        return this.loadedCommands.size;
    }

    getCommand(name) {
        if (!name) return null;
        return this.loadedCommands.get(name) || this.loadedCommands.get(this.aliases.get(name)) || null;
    }

    getCommandsByCategory(category) {
        const names = this.commandCategories.get(category) || [];
        return names.map(n => this.loadedCommands.get(n)).filter(Boolean);
    }

    getAllCommands() {
        return Array.from(this.loadedCommands.values());
    }

    getAllCategories() {
        return Array.from(this.commandCategories.keys());
    }

    enableCommand(name) {
        this.disabledCommands.delete(name);
        return true;
    }

    disableCommand(name) {
        this.disabledCommands.add(name);
        return true;
    }

    isCommandEnabled(name) {
        return !this.disabledCommands.has(name);
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
            usage.avgExecutionTime = Math.round((usage.avgExecutionTime * (usage.used - 1) + executionTime) / usage.used);
        } else {
            usage.errors++;
        }
    }

    searchCommands(query) {
        const lowerQuery = query.toLowerCase();
        const results = [];
        for (const command of this.loadedCommands.values()) {
            const nameMatch = command.name.includes(lowerQuery);
            const aliasMatch = command.aliases?.some(a => a.includes(lowerQuery));
            const descMatch = command.description?.toLowerCase().includes(lowerQuery);
            if (nameMatch || aliasMatch || descMatch) {
                results.push(command);
            }
        }
        return results.sort((a, b) => {
            const aExact = a.name === lowerQuery ? 0 : 1;
            const bExact = b.name === lowerQuery ? 0 : 1;
            return aExact - bExact;
        });
    }

    getSystemStats() {
        const totalCommands = this.loadedCommands.size;
        const usageStats = Array.from(this.commandUsage.values());
        return {
            totalCommands,
            enabledCommands: totalCommands - this.disabledCommands.size,
            disabledCommands: this.disabledCommands.size,
            categories: this.commandCategories.size,
            totalAliases: this.aliases.size,
            totalUsage: usageStats.reduce((s, u) => s + u.used, 0),
            totalErrors: usageStats.reduce((s, u) => s + u.errors, 0)
        };
    }

    getTopCommands(limit = 10) {
        return Array.from(this.commandUsage.entries())
            .sort((a, b) => b[1].used - a[1].used)
            .slice(0, limit)
            .map(([name, stats]) => ({ name, ...stats }));
    }
}

export const commandManager = new CommandManager();

export const initializeCommands = () => commandManager.initializeCommands();
export const getCommand = (name) => commandManager.getCommand(name);
export const getAllCommands = () => commandManager.getAllCommands();
export const getCommandsByCategory = (cat) => commandManager.getCommandsByCategory(cat);
export const getAllCategories = () => commandManager.getAllCategories();
export const reloadCommand = (name) => commandManager.reloadCommand(name);
export const reloadCategory = (cat) => commandManager.reloadCategory(cat);
export const reloadAllCommands = () => commandManager.reloadAllCommands();
export const enableCommand = (name) => commandManager.enableCommand(name);
export const disableCommand = (name) => commandManager.disableCommand(name);
export const isCommandEnabled = (name) => commandManager.isCommandEnabled(name);
export const searchCommands = (query) => commandManager.searchCommands(query);
export const getSystemStats = () => commandManager.getSystemStats();
export const recordCommandUsage = (name, time, success) => commandManager.recordCommandUsage(name, time, success);
export const getTopCommands = (limit) => commandManager.getTopCommands(limit);
