import logger from '../utils/logger.js';
import config from '../config.js';
import { getGroup } from '../models/Group.js';

export default async function handleMessageDelete(sock, update) {
    try {
        const { fromMe, id, participant } = update;
        
        if (fromMe) return;
        
        const groupId = id?.remoteJid;
        if (!groupId || !groupId.endsWith('@g.us')) return;
        
        const group = await getGroup(groupId);
        if (!group || !group.settings?.antiDelete?.enabled) return;
        
        const deletedBy = participant || id?.participant;
        if (!deletedBy) return;
        
        const cacheKey = `deleted_${id.id}`;
        const cachedMessage = global.messageCache?.get(cacheKey);
        
        if (!cachedMessage) {
            logger.debug('No cached message found for deleted message');
            return;
        }
        
        const userName = deletedBy.split('@')[0];
        
        let notificationText = `╭──⦿【 🗑️ ANTI-DELETE 】\n│\n│ 👤 User: @${userName}\n│ 🚫 Deleted a message\n│ 📝 Original message:\n│\n`;
        
        if (cachedMessage.text) {
            notificationText += `│ "${cachedMessage.text}"\n│\n`;
        }
        
        notificationText += `╰────────────⦿`;
        
        const messageContent = {
            text: notificationText,
            mentions: [deletedBy]
        };
        
        if (cachedMessage.media) {
            messageContent.image = cachedMessage.media;
            messageContent.caption = notificationText;
            delete messageContent.text;
        }
        
        await sock.sendMessage(groupId, messageContent);
        
        logger.info(`Anti-delete notification sent for ${userName}`);
        
    } catch (error) {
        logger.error('Error in messageDelete event:', error);
    }
}
