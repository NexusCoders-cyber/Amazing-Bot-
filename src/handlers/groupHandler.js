import logger from '../utils/logger.js';
import config from '../config.js';
import handleGroupJoin from '../events/groupJoin.js';
import handleGroupLeave from '../events/groupLeave.js';
import axios from 'axios';
import { createPromoteImage, createDemoteImage } from '../utils/canvasUtils.js';
import { normNum } from '../utils/adminUtils.js';

async function getProfilePicture(sock, jid) {
    try { return await sock.profilePictureUrl(jid, 'image'); }
    catch { return null; }
}

async function downloadProfilePic(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
        return Buffer.from(response.data);
    } catch { return null; }
}

class GroupHandler {
    constructor() {
        this.groupStats = new Map();
    }

    async handleParticipantsUpdate(sock, groupUpdate) {
        try {
            const { id, participants, action } = groupUpdate;

            logger.info(`Group participants update: ${id} - Action: ${action} - Participants: ${participants?.length || 0}`);

            if (action === 'add') {
                await handleGroupJoin(sock, groupUpdate);
                this.updateStats(id, 'joins', participants.length);
            } else if (action === 'remove' || action === 'leave') {
                await handleGroupLeave(sock, groupUpdate);
                this.updateStats(id, 'leaves', participants.length);
            } else if (action === 'promote') {
                if (config.events?.groupPromote) {
                    await this.handleGroupPromote(sock, groupUpdate);
                }
                this.updateStats(id, 'updates', 1);
            } else if (action === 'demote') {
                if (config.events?.groupDemote) {
                    await this.handleGroupDemote(sock, groupUpdate);
                }
                this.updateStats(id, 'updates', 1);
            }
        } catch (error) {
            logger.error('Error handling participants update:', error);
        }
    }

    async handleGroupPromote(sock, groupUpdate) {
        try {
            const { id: groupId, participants, author } = groupUpdate;
            const groupMetadata = await sock.groupMetadata(groupId);
            const groupName = groupMetadata.subject || 'Group';

            for (const participant of participants) {
                const userName = normNum(participant);
                const authorName = author ? normNum(author) : 'Admin';

                try {
                    const profilePicUrl = await getProfilePicture(sock, participant);
                    const profilePicBuffer = profilePicUrl ? await downloadProfilePic(profilePicUrl) : null;
                    const promoteImage = await createPromoteImage(userName, groupName, authorName);

                    const text = `@${userName} has been promoted to admin.\nPromoted by: @${authorName}`;
                    const mentions = [participant, author].filter(Boolean);

                    const image = profilePicBuffer || promoteImage;
                    if (image) {
                        await sock.sendMessage(groupId, { image, caption: text, mentions });
                    } else {
                        await sock.sendMessage(groupId, { text, mentions });
                    }
                } catch (err) {
                    logger.error(`Error sending promote notification for ${participant}:`, err);
                    try {
                        await sock.sendMessage(groupId, {
                            text: `@${userName} has been promoted to admin.`,
                            mentions: [participant]
                        });
                    } catch {}
                }
            }
        } catch (error) {
            logger.error('Error handling group promote:', error);
        }
    }

    async handleGroupDemote(sock, groupUpdate) {
        try {
            const { id: groupId, participants, author } = groupUpdate;
            const groupMetadata = await sock.groupMetadata(groupId);
            const groupName = groupMetadata.subject || 'Group';

            for (const participant of participants) {
                const userName = normNum(participant);
                const authorName = author ? normNum(author) : 'Admin';

                try {
                    const profilePicUrl = await getProfilePicture(sock, participant);
                    const profilePicBuffer = profilePicUrl ? await downloadProfilePic(profilePicUrl) : null;
                    const demoteImage = await createDemoteImage(userName, groupName, authorName);

                    const text = `@${userName} has been demoted to member.\nDemoted by: @${authorName}`;
                    const mentions = [participant, author].filter(Boolean);

                    const image = profilePicBuffer || demoteImage;
                    if (image) {
                        await sock.sendMessage(groupId, { image, caption: text, mentions });
                    } else {
                        await sock.sendMessage(groupId, { text, mentions });
                    }
                } catch (err) {
                    logger.error(`Error sending demote notification for ${participant}:`, err);
                    try {
                        await sock.sendMessage(groupId, {
                            text: `@${userName} has been demoted to member.`,
                            mentions: [participant]
                        });
                    } catch {}
                }
            }
        } catch (error) {
            logger.error('Error handling group demote:', error);
        }
    }

    async handleGroupUpdate(sock, groupsUpdate) {
        if (!config.events?.groupUpdate) return;
        try {
            for (const group of groupsUpdate) {
                logger.debug(`Group updated: ${group.id}`);
                if (group.subject) await this.handleGroupNameChange(sock, group);
                if (group.desc !== undefined) await this.handleGroupDescChange(sock, group);
                this.updateStats(group.id, 'updates', 1);
            }
        } catch (error) {
            logger.error('Error handling group update:', error);
        }
    }

    async handleGroupNameChange(sock, group) {
        try {
            const { id: groupId, subject: newSubject, author } = group;
            const authorName = author ? normNum(author) : 'Admin';
            await sock.sendMessage(groupId, {
                text: `Group name changed to: ${newSubject}\nChanged by: @${authorName}`,
                mentions: author ? [author] : []
            });
        } catch (error) {
            logger.error('Error sending group name change notification:', error);
        }
    }

    async handleGroupDescChange(sock, group) {
        try {
            const { id: groupId, desc: newDesc, author } = group;
            const authorName = author ? normNum(author) : 'Admin';
            await sock.sendMessage(groupId, {
                text: `Group description updated by: @${authorName}\n\n${newDesc || 'No description'}`,
                mentions: author ? [author] : []
            });
        } catch (error) {
            logger.error('Error sending group description change notification:', error);
        }
    }

    updateStats(groupId, type, count) {
        if (!this.groupStats.has(groupId)) {
            this.groupStats.set(groupId, { joins: 0, leaves: 0, updates: 0 });
        }
        const stats = this.groupStats.get(groupId);
        stats[type] += count;
        this.groupStats.set(groupId, stats);
    }

    getGroupStats(groupId = null) {
        if (groupId) return this.groupStats.get(groupId) || { joins: 0, leaves: 0, updates: 0 };
        return {
            totalGroups: this.groupStats.size,
            updates: Array.from(this.groupStats.values()).reduce((acc, s) => acc + s.updates, 0),
            joins: Array.from(this.groupStats.values()).reduce((acc, s) => acc + s.joins, 0),
            leaves: Array.from(this.groupStats.values()).reduce((acc, s) => acc + s.leaves, 0)
        };
    }
}

export default new GroupHandler();
