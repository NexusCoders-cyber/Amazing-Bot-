import { updateGroup } from '../../models/Group.js';

async function getProfilePic(sock, jid) {
    try { return await sock.profilePictureUrl(jid, 'image'); }
    catch { return null; }
}

function renderWelcomeTemplate(template = '', participantJid = '', groupName = 'the group') {
    const userNum = String(participantJid || '').split('@')[0] || 'user';
    const userMention = `@${userNum}`;
    const raw = String(template || '');
    const wantsProfilePic = /(&getpp|\{pp\})/i.test(raw);

    const text = raw
        .replace(/&getpp|\{pp\}/gi, '')
        .replace(/@user|\{user\}|&mention|\bmentions user\b/gi, userMention)
        .replace(/@group|\{group\}|\(group name\)|&group/gi, groupName)
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return {
        text: text || `👋 Welcome ${userMention} to ${groupName}!`,
        wantsProfilePic
    };
}

export default {
    name: 'welcome',
    aliases: ['welcometext', 'setwelcome'],
    category: 'admin',
    description: 'Toggle welcome messages or set custom welcome text',
    usage: 'welcome [on/off] [custom message]',
    cooldown: 5,
    permissions: ['admin'],

    async execute({ sock, message, args, from, group, isGroup, prefix, command }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ *Group Only*\n\nThis command can only be used in groups.'
            });
        }

        try {
            const action = args[0]?.toLowerCase();
            const currentStatus = group?.settings?.welcome?.enabled || false;
            const currentMessage = group?.settings?.welcome?.message
                || '👋 Welcome @user to @group!\n\nKindly do intro:\n• Pics\n• Age\n• Location\n\n📌 Please read the group description.';

            if (!action && command !== 'setwelcome') {
                return await sock.sendMessage(from, {
                    text: `👋 *Welcome Settings*\n\n*Status:* ${currentStatus ? 'Enabled ✅' : 'Disabled ❌'}\n*Message:* ${currentMessage}\n\n*Usage:*\n• ${prefix}welcome on/off\n• ${prefix}welcome set Your message here\n• ${prefix}setwelcome Your message here\n\n*Variables:*\n• @user or &mention - User mention\n• @group - Group name\n• &getpp - Send with user profile picture`
                });
            }

            if (action === 'on' || action === 'enable' || action === '1') {
                await updateGroup(from, {
                    $set: { 'settings.welcome.enabled': true }
                });

                await sock.sendMessage(from, {
                    text: '✅ *Welcome Messages Enabled*\n\nNew members will receive welcome messages when they join.'
                });

            } else if (action === 'off' || action === 'disable' || action === '0') {
                await updateGroup(from, {
                    $set: { 'settings.welcome.enabled': false }
                });

                await sock.sendMessage(from, {
                    text: '❌ *Welcome Messages Disabled*\n\nNew members will not receive welcome messages.'
                });

            } else if (
                action === 'set' ||
                action === 'message' ||
                command === 'setwelcome' ||
                (action && !['on', 'enable', '1', 'off', 'disable', '0', 'test'].includes(action))
            ) {
                const customMessage = command === 'setwelcome'
                    ? args.join(' ')
                    : (action === 'set' || action === 'message' ? args.slice(1).join(' ') : args.join(' '));

                if (!customMessage) {
                    return await sock.sendMessage(from, {
                        text: `❌ *No Message*\n\nPlease provide a custom welcome message.\n\n*Example:* ${prefix}setwelcome hello &mention &getpp welcome to @group`
                    });
                }

                await updateGroup(from, {
                    $set: {
                        'settings.welcome.message': customMessage,
                        'settings.welcome.enabled': true
                    }
                });

                await sock.sendMessage(from, {
                    text: `✅ *Custom Welcome Message Set*\n\n*New Message:* ${customMessage}\n\nWelcome messages are now enabled with your custom text.`
                });

            } else if (action === 'test') {
                const groupMeta = await sock.groupMetadata(from);
                const sourceMentions = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                const targetJid = sourceMentions[0] || message.key.participant || message.participant;

                const rendered = renderWelcomeTemplate(currentMessage, targetJid, groupMeta.subject || 'the group');
                const ppUrl = targetJid ? await getProfilePic(sock, targetJid) : null;

                if (ppUrl && rendered.wantsProfilePic) {
                    await sock.sendMessage(from, {
                        image: { url: ppUrl },
                        caption: `🧪 *Welcome Message Test*\n\n${rendered.text}`,
                        mentions: targetJid ? [targetJid] : []
                    });
                } else {
                    await sock.sendMessage(from, {
                        text: `🧪 *Welcome Message Test*\n\n${rendered.text}`,
                        mentions: targetJid ? [targetJid] : []
                    });
                }

            } else {
                return await sock.sendMessage(from, {
                    text: '❌ *Invalid Option*\n\nUse: on/off, set [message], setwelcome [message], or test'
                });
            }

        } catch (error) {
            console.error('Welcome command error:', error);
            await sock.sendMessage(from, {
                text: '❌ *Error*\n\nFailed to update welcome settings.'
            });
        }
    }
};
