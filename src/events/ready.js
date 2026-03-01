import logger from '../utils/logger.js';
import config from '../config.js';
import { loadCommands } from '../handlers/commandHandler.js';
import { loadPlugins } from '../utils/pluginManager.js';

export default async function handleReady(sock) {
    try {
        logger.info('🎉 Bot is ready and operational!');
        
        await loadCommands();
        logger.info('✅ Commands loaded successfully');
        
        await loadPlugins();
        logger.info('✅ Plugins loaded successfully');

        logger.info(`📱 Bot Name: ${config.botName}`);
        logger.info(`🔧 Version: ${config.botVersion}`);
        logger.info(`🌐 Mode: ${config.publicMode ? 'Public' : 'Private'}`);
        logger.info(`🎯 Prefix: ${config.prefix}`);

        if (sock.user) {
            logger.info(`📞 Connected as: ${sock.user.name || sock.user.id}`);
        }

    } catch (error) {
        logger.error('Ready event error:', error);
    }
}
