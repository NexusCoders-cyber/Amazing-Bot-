import logger from '../utils/logger.js';

export default async function handleMessageReaction(sock, reaction) {
    try {
        if (!reaction || !reaction.key) return;
        
        const messageId = reaction.key.id;
        const from = reaction.key.remoteJid;
        const sender = reaction.key.participant || from;
        const reactionEmoji = reaction.reaction?.text;
        
        if (!reactionEmoji) return;
        
        logger.info(`Reaction received: ${reactionEmoji} on message ${messageId} by ${sender}`);
        
        if (global.reactHandlers && global.reactHandlers[messageId]) {
            const reactHandler = global.reactHandlers[messageId];
            await reactHandler.handler(reactionEmoji, sender);
        }
        
    } catch (error) {
        logger.error('Reaction handling error:', error);
    }
}
