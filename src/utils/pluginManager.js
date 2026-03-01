import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.activePlugins = new Set();
        this.pluginStates = new Map();
        this.pluginDir = path.join(__dirname, '..', 'plugins');
    }

    async loadPlugin(pluginName) {
        try {
            const pluginPath = path.join(this.pluginDir, `${pluginName}.js`);
            
            if (!await fs.pathExists(pluginPath)) {
                logger.warn(`Plugin ${pluginName} not found`);
                return false;
            }

            delete require.cache[require.resolve(pluginPath)];
            const plugin = require(pluginPath);
            
            this.plugins.set(pluginName, plugin);
            this.pluginStates.set(pluginName, 'loaded');
            
            if (plugin.enabled !== false) {
                await this.activatePlugin(pluginName);
            }
            
            logger.info(`Plugin loaded: ${pluginName}`);
            return true;
        } catch (error) {
            logger.error(`Failed to load plugin ${pluginName}:`, error);
            this.pluginStates.set(pluginName, 'error');
            return false;
        }
    }

    async activatePlugin(name) {
        try {
            const plugin = this.plugins.get(name);
            if (!plugin) return false;

            if (plugin.onLoad && typeof plugin.onLoad === 'function') {
                await plugin.onLoad();
            }

            this.activePlugins.add(name);
            this.pluginStates.set(name, 'active');
            
            logger.info(`Activated plugin: ${name}`);
            return true;
        } catch (error) {
            logger.error(`Failed to activate plugin ${name}:`, error);
            this.pluginStates.set(name, 'error');
            return false;
        }
    }

    getPluginStats() {
        return {
            total: this.plugins.size,
            active: this.activePlugins.size,
            loaded: Array.from(this.pluginStates.values()).filter(state => state === 'loaded').length,
            errors: Array.from(this.pluginStates.values()).filter(state => state === 'error').length
        };
    }
}

export const pluginManager = new PluginManager();

export const loadPlugins = () => {
    logger.info('Plugin system initialized');
    return Promise.resolve();
};

export const getActiveCount = () => pluginManager.activePlugins.size;