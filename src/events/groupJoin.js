import logger from '../utils/logger.js';
import config from '../config.js';
import { isBanned } from '../commands/admin/ban.js';
import { normNum } from '../utils/adminUtils.js';
import { getGroup } from '../models/Group.js';
import { translateTextIfNeeded } from '../utils/languageManager.js';

async function getProfilePic(sock, jid) {
    try { return await sock.profilePictureUrl(jid, 'image'); }
    catch { return null; }
}

function renderWelcomeTemplate(template = '', participant = '', groupName = 'the group', members=0, admins=0) {
    const num = normNum(participant) || 'user';
    const mention = `@${num}`;
    const now = new Date();
    const date = now.toLocaleDateString('en-GB');
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return String(template || '')
        .replace(/&getpp|\{pp\}/gi, '')
        .replace(/@user|\{user\}|&mention|\bmentions user\b/gi, mention)
        .replace(/@group|\{group\}|\(group name\)|&group/gi, groupName)
        .replace(/@members|\{members\}/gi, String(members))
        .replace(/@admins|\{admins\}/gi, String(admins))
        .replace(/@date|\{date\}/gi, date)
        .replace(/@time|\{time\}/gi, time)
        .replace(/\n{3,}/g, '\n\n')
        .trim() || `👋 Welcome ${mention} to ${groupName}!`;
}

export default async function handleGroupJoin(sock, groupUpdate) {
    const { id: groupId, participants, action } = groupUpdate;
    if (action && action !== 'add') return;
    try {
        const meta = await sock.groupMetadata(groupId);
        const groupName = meta.subject || 'the group';
        const savedGroup = await getGroup(groupId);
        const groupLang = savedGroup?.settings?.language || 'en';
        const adminCount = (meta.participants || []).filter(p => p.admin).length;
        const memberCount = (meta.participants || []).length;
        const welcomeEnabled = savedGroup?.settings?.welcome?.enabled;
        const welcomeTemplate = savedGroup?.settings?.welcome?.message
            || `┏━〔 👋 Welcome by Escanor 👋 〕━━━━━┓\n┃ 👤 New member: @user\n┃ 👥 Group: @group\n┃ 📊 Members: @members\n┃ 👑 Admins: @admins\n┃ 📅 Date: @date\n┃ ⏰ Time: @time\n┃ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n┃ "Welcome among us, @user.\n┃ I am Escanor, Lion of Pride.\n┃ You now walk in my domain.\n┃ Respect the rules, or face exile."\n┃ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n┃ 🔥 Domain Rules:\n┃ • Respect everyone\n┃ • No forbidden links/content\n┃ • Enjoy, but keep it classy\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`; 

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

            if (!config.events?.groupJoin || !welcomeEnabled) continue;

            try {
                const ppUrl = await getProfilePic(sock, participant);
                const text = await translateTextIfNeeded(
                    renderWelcomeTemplate(welcomeTemplate, participant, groupName, memberCount, adminCount),
                    groupLang
                );

                if (ppUrl) {
                    await sock.sendMessage(groupId, {
                        image: { url: ppUrl },
                        caption: text,
                        mentions: [participant]
                    });
                    continue;
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
