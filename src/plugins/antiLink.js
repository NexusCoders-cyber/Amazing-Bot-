import logger from '../utils/logger.js';
import { getGroup, updateGroup } from '../models/Group.js';
import { getUser, updateUser } from '../models/User.js';
import { addWarning } from '../models/Warning.js';
import config from '../config.js';

const linkPatterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:chat\.)?whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?wa\.me\/([a-zA-Z0-9]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?t\.me\/([a-zA-Z0-9_]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?telegram\.me\/([a-zA-Z0-9_]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?discord\.gg\/([a-zA-Z0-9]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?discord\.com\/invite\/([a-zA-Z0-9]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/groups\/([a-zA-Z0-9._]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?fb\.com\/groups\/([a-zA-Z0-9._]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/([a-zA-Z0-9._]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9._]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?twitter\.com\/([a-zA-Z0-9._]+)/gi,
    /(?:https?:\/\/)?(?:www\.)?x\.com\/([a-zA-Z0-9._]+)/gi
];

const suspiciousPatterns = [
    /\b(?:bit\.ly|tinyurl\.com|shorturl\.at|ow\.ly|is\.gd|buff\.ly)\/[a-zA-Z0-9]+/gi,
    /\b[a-zA-Z0-9-]+\.(?:tk|ml|ga|cf|gq)\b/gi,
    /(?:https?:\/\/)?[a-zA-Z0-9-]+\.link\/[a-zA-Z0-9]+/gi,
    /(?:https?:\/\/)?[a-zA-Z0-9-]+\.xyz\/[a-zA-Z0-9]+/gi
];

function detectLinks(text) {
    const detectedLinks = [];
    
    for (const pattern of linkPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            detectedLinks.push(...matches.map(match => ({
                type: 'direct_link',
                link: match,
                pattern: pattern.toString()
            })));
        }
    }
    
    for (const pattern of suspiciousPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            detectedLinks.push(...matches.map(match => ({
                type: 'suspicious_link',
                link: match,
                pattern: pattern.toString()
            })));
        }
    }
    
    return detectedLinks;
}

function isWhatsAppGroupLink(text) {
    const waPattern = /(?:https?:\/\/)?(?:www\.)?(?:chat\.)?whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]+)/gi;
    return waPattern.test(text);
}

async function isGroupAdmin(sock, groupId, participantJid) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const participant = groupMetadata.participants.find(p => 
            p.id === participantJid || 
            p.lid === participantJid
        );
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch (error) {
        logger.error('Error checking admin status:', error);
        return false;
    }
}

function isOwner(jid) {
    const extractPhone = (num) => num.replace(/@s\.whatsapp\.net/g, '').replace(/@c\.us/g, '').split('@')[0].trim();
    const userPhone = extractPhone(jid);
    return config.ownerNumbers.some(ownerNum => extractPhone(ownerNum) === userPhone);
}

export default async function handleAntiLink(sock, message) {
    try {
        const from = message.key.remoteJid;
        const sender = message.key.participant || from;
        const isGroup = from.endsWith('@g.us');
        
        if (!isGroup) return;
        
        const group = await getGroup(from);
        if (!group || !group.settings?.antiLink?.enabled) return;
        
        if (isOwner(sender)) return;
        
        const isAdmin = await isGroupAdmin(sock, from, sender);
        if (isAdmin) return;
        
        const messageText = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text || 
                           message.message?.imageMessage?.caption ||
                           message.message?.videoMessage?.caption || '';
        
        if (!messageText) return;
        
        const detectedLinks = detectLinks(messageText);
        
        if (detectedLinks.length === 0) return;
        
        const user = await getUser(sender);
        const userName = user?.name || sender.split('@')[0];
        
        const action = group.settings.antiLink.action || 'warn';
        const strictMode = group.settings.antiLink.strictMode || false;
        
        const hasWhatsAppLink = isWhatsAppGroupLink(messageText);
        
        if (!strictMode && !hasWhatsAppLink) {
            return;
        }
        
        try {
            await sock.sendMessage(from, { delete: message.key });
            logger.info(`Deleted message with link from ${userName} in ${from}`);
        } catch (error) {
            logger.error('Error deleting message:', error);
        }
        
        const linkTypes = [...new Set(detectedLinks.map(l => l.type))].join(', ');
        const linkCount = detectedLinks.length;
        
        await updateGroup(from, {
            $inc: { 'stats.linksDeleted': linkCount }
        });
        
        if (action === 'delete') {
            await sock.sendMessage(from, {
                text: `╭──⦿【 🚫 ANTI-LINK 】\n│\n│ ⚠️ Link detected and deleted!\n│ 👤 User: @${sender.split('@')[0]}\n│ 🔗 Links found: ${linkCount}\n│ 📝 Type: ${linkTypes}\n│ 🛡️ Action: Message deleted\n│\n╰────────────⦿`,
                mentions: [sender]
            });
        } else if (action === 'warn') {
            const warning = await addWarning(sender, from, 'Sending prohibited links', sock.user.id);
            
            await sock.sendMessage(from, {
                text: `╭──⦿【 ⚠️ WARNING 】\n│\n│ 🚫 Link detected and deleted!\n│ 👤 User: @${sender.split('@')[0]}\n│ 🔗 Links found: ${linkCount}\n│ 📝 Type: ${linkTypes}\n│ ⚠️ Warning: ${warning.count}/${config.limits.maxWarnings}\n│\n│ 📋 Links are not allowed in this group!\n${warning.count >= config.limits.maxWarnings ? '│ 🚪 Maximum warnings reached! User will be removed.\n' : ''}│\n╰────────────⦿`,
                mentions: [sender]
            });
            
            if (warning.count >= config.limits.maxWarnings) {
                try {
                    await sock.groupParticipantsUpdate(from, [sender], 'remove');
                    await sock.sendMessage(from, {
                        text: `╭──⦿【 🚪 AUTO-KICK 】\n│\n│ ❌ @${sender.split('@')[0]} has been removed\n│ 🔴 Reason: Maximum warnings reached\n│ 📊 Total warnings: ${warning.count}\n│ 🔗 Violated rule: No links allowed\n│\n╰────────────⦿`,
                        mentions: [sender]
                    });
                } catch (error) {
                    logger.error('Error kicking user:', error);
                }
            }
        } else if (action === 'kick') {
            try {
                await sock.groupParticipantsUpdate(from, [sender], 'remove');
                await sock.sendMessage(from, {
                    text: `╭──⦿【 🚫 ANTI-LINK KICK 】\n│\n│ 🚪 @${sender.split('@')[0]} has been removed\n│ 🔴 Reason: Sending prohibited links\n│ 🔗 Links found: ${linkCount}\n│ 📝 Type: ${linkTypes}\n│ 🛡️ Zero tolerance policy active\n│\n╰────────────⦿`,
                    mentions: [sender]
                });
            } catch (error) {
                logger.error('Error kicking user:', error);
                await sock.sendMessage(from, {
                    text: `╭──⦿【 ❌ ERROR 】\n│\n│ Failed to kick @${sender.split('@')[0]}\n│ 🔐 Make sure bot is admin\n│ 🔗 Link was still deleted\n│\n╰────────────⦿`,
                    mentions: [sender]
                });
            }
        }
        
        await updateUser(sender, {
            $inc: { 'violations.linksSent': linkCount }
        });
        
    } catch (error) {
        logger.error('Error in antiLink plugin:', error);
    }
}

export { detectLinks, isWhatsAppGroupLink };
