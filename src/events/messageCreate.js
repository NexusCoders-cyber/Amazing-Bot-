import logger from '../utils/logger.js';

export default async function handleMessageCreate(sock, message) {
    try {
        if (!message || !message.key) return;

        const from = message.key.remoteJid;
        const sender = message.key.participant || from;
        const isGroup = from.endsWith('@g.us');

        logger.debug(`New message from ${sender} in ${isGroup ? 'group' : 'private'}`);

    } catch (error) {
        logger.error('Message create event error:', error);
    }
}
