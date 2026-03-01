import logger from '../utils/logger.js';
import config from '../config.js';
import { isBanned } from '../commands/admin/ban.js';
import { normNum } from '../utils/adminUtils.js';

async function getProfilePic(sock, jid) {
    try { return await sock.profilePictureUrl(jid, 'image'); }
    catch { return null; }
}

export default async function handleGroupJoin(sock, groupUpdate) {
    const { id: groupId, participants } = groupUpdate;
    try {
        const meta = await sock.groupMetadata(groupId);
        const groupName = meta.subject || 'the group';

        for (const participant of participants) {
            if (await isBanned(groupId, participant)) {
                try {
                    await sock.groupParticipantsUpdate(groupId, [participant], 'remove');
                    await sock.sendMessage(groupId, {
                        text: `@${normNum(participant)} is banned from this group.`,
                        mentions: [participant]
                    });
                } catch {}
                continue;
            }

            if (!config.events?.groupJoin) continue;

            try {
                const num = normNum(participant);
                const ppUrl = await getProfilePic(sock, participant);
                const text = `Welcome @${num} to ${groupName}!\nWe now have ${meta.participants.length} members.`;

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
                logger.error(`groupJoin notification error for ${participant}:`, err);
            }
        }
    } catch (err) {
        logger.error('handleGroupJoin error:', err);
    }
}
