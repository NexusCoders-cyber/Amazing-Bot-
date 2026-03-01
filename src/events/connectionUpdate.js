import logger from '../utils/logger.js';
import config from '../config.js';

export default async function handleConnectionUpdate(sock, update) {
    try {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            logger.info('QR Code generated for scanning');
        }

        if (connection === 'connecting') {
            logger.info('🔗 Connecting to WhatsApp...');
        }

        if (connection === 'open') {
            logger.info('✅ WhatsApp connection established successfully');
            logger.info(`Bot: ${config.botName} v${config.botVersion}`);
            logger.info(`Mode: ${config.publicMode ? 'Public' : 'Private'}`);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            logger.warn(`Connection closed with status code: ${statusCode}`);
        }
    } catch (error) {
        logger.error('Connection update error:', error);
    }
}
