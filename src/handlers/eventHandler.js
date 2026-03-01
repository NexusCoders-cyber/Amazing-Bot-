import logger from '../utils/logger.js';

class EventHandler {
    constructor() {
        this.eventCounts = new Map();
    }

    async handleContactUpdate(sock, contactUpdates) {
        try {
            for (const contact of contactUpdates) {
                if (contact.id && contact.name) {
                    logger.debug(`Contact updated: ${contact.name} (${contact.id})`);
                }
            }
        } catch (error) {
            logger.error('Error handling contact update:', error);
        }
    }

    async handlePresenceUpdate(sock, presenceUpdate) {
        try {
            const { id, presences } = presenceUpdate;
            logger.debug(`Presence update for ${id}:`, presences);
        } catch (error) {
            logger.error('Error handling presence update:', error);
        }
    }

    async handleBlocklistUpdate(sock, blocklistUpdate) {
        try {
            logger.debug('Blocklist updated:', blocklistUpdate);
        } catch (error) {
            logger.error('Error handling blocklist update:', error);
        }
    }

    getEventStats() {
        return {
            contacts: this.eventCounts.get('contacts') || 0,
            presence: this.eventCounts.get('presence') || 0,
            blocklist: this.eventCounts.get('blocklist') || 0
        };
    }

    incrementEventCount(type) {
        const current = this.eventCounts.get(type) || 0;
        this.eventCounts.set(type, current + 1);
    }
}

export default new EventHandler();