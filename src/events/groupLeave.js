import logger from '../utils/logger.js';
import config from '../config.js';
import { normNum } from '../utils/adminUtils.js';

async function getProfilePic(sock, jid) {
    try { return await sock.profilePictureUrl(jid, 'image'); }
    catch { return null; }
}

export default async function handleGroupLeave(sock, groupUpdate) {
    const { id: groupId, participants } = groupUpdate;
    if (!config.events?.groupLeave) return;

    try {
        const meta = await sock.groupMetadata(groupId);
        const groupName = meta.subject || 'the group';

        for (const participant of participants) {
            try {
                const num = normNum(participant);
                const ppUrl = await getProfilePic(sock, participant);
                const text = `@${num} has left ${groupName}.\nWe now have ${meta.participants.length} members.`;

                if (ppUrl) {
                    try {
                        const axios = (await import('axios')).default;
                        const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 });
                        await sock.sendMessage(groupId, {
                            image: Buffer.from(res.data),
                            caption: text,
                            mentions: [participant]
                        });
                        continue;
                    } catch {}
                }

                await sock.sendMessage(groupId, { text, mentions: [participant] });
            } catch (err) {
                logger.error(`groupLeave notification error for ${participant}:`, err);
            }
        }
    } catch (err) {
        logger.error('handleGroupLeave error:', err);
    }
}
