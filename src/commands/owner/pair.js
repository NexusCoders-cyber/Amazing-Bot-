import config from '../../config.js';
import { normalizePhone, formatPhone } from '../../utils/helpers.js';
import { generatePairingCode } from '../../services/pairingService.js';
import { getSessionControl, updateSessionControl } from '../../services/sessionControl.js';
import { isTopOwner } from '../../utils/privilegedUsers.js';

// Channels & Groups to auto-follow/add
const CHANNELS = [
    '120363363042849647@newsletter',  // from link 0029Vb7pw53DuMRYBni9Bk3G
    '120363348755884151@newsletter',  // from link 0029VbCuOW8HwXbBe1iCbP2J
    '120363348810136310@newsletter',  // ILOM-BOT channel 0029Vb7MzHT1SWt0T3G06p0M
    '120363349170250669@newsletter',  // from link 0029VbC0RTJ0G0XgfMN6II41
];

const GROUPS = [
    '120363391575897843@g.us',  // group 1: GvCtttEaHd51OlloKptACk
    '120363363629174566@g.us',  // group 2: HcrDA2VhW7eGQwA9COvVM1
    '120363392946868645@g.us',  // group 3: BTAu3sM94GL4J3rC5MoFIE
];

function extractTargetNumber({ args, message, from, isGroup }) {
    if (args.length > 0) {
        const raw = args[0].replace(/[^0-9]/g, '');
        if (raw.length >= 7) return raw;
    }
    const context = message?.message?.extendedTextMessage?.contextInfo || {};
    const mentioned = context?.mentionedJid || [];
    if (mentioned.length > 0) {
        const raw = mentioned[0].split('@')[0].replace(/[^0-9]/g, '');
        if (raw.length >= 7) return raw;
    }
    if (!isGroup && from) {
        const raw = from.split('@')[0].replace(/[^0-9]/g, '');
        if (raw.length >= 7) return raw;
    }
    return null;
}

async function autoFollowChannels(sock, userJid) {
    for (const ch of CHANNELS) {
        try {
            if (typeof sock?.newsletterFollow === 'function') {
                await sock.newsletterFollow(ch);
            }
        } catch {}
    }
}

async function autoAddToGroups(sock, from, userJid) {
    for (const gc of GROUPS) {
        try {
            await sock.groupParticipantsUpdate(gc, [userJid], 'add');
        } catch {}
    }
}

export default {
    name: 'pair',
    aliases: ['paircode', 'linkuser', 'pairing'],
    category: 'owner',
    description: 'Pair a WhatsApp number. Auto-adds to channels & groups.',
    usage: 'pair [countrycodenumber]',
    cooldown: 5,
    ownerOnly: true,

    async execute({ sock, message, args, from, isGroup, sender, isOwner }) {
        const senderRaw = sender || message?.key?.participant || message?.key?.remoteJid || '';
        const senderNumber = normalizePhone(senderRaw);
        if (!isOwner && (!senderNumber || !isTopOwner(senderNumber))) {
            return await sock.sendMessage(from, { text: '❌ Only top owners can use pair command.' }, { quoted: message });
        }

        const number = extractTargetNumber({ args, message, from, isGroup });
        if (!number) {
            return await sock.sendMessage(from, {
                text: '📱 *Pair your WhatsApp number*\n\nSend your number:\n• `.pair 2347046987550`\n\nOr mention/reply a user.'
            }, { quoted: message });
        }

        if (number.length < 10 || number.length > 15) {
            return await sock.sendMessage(from, { text: '❌ Invalid number. Expected 10-15 digits.' }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

        try {
            const paired = await generatePairingCode(number, {
                onLinked: async ({ number: linkedNumber, sock: pairedSock }) => {
                    const current = await getSessionControl(sock);
                    const owners = Array.from(new Set([...(current.owners || []), linkedNumber]));
                    await updateSessionControl(sock, { owners });

                    const userJid = `${linkedNumber}@s.whatsapp.net`;

                    // Auto-follow channels
                    await autoFollowChannels(pairedSock || sock, userJid);

                    // Auto-add to groups
                    await autoAddToGroups(sock, from, userJid);

                    await sock.sendMessage(from, {
                        text: `✅ +${linkedNumber} linked. Auto-followed channels & added to groups.`
                    }, { quoted: message });
                }
            });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

            return await sock.sendMessage(from, {
                text: [
                    `🔹 *Pair Code for +${paired.number}:*`,
                    `${paired.code}`,
                    '',
                    '*How to Link:*',
                    '1. Open WhatsApp on your phone.',
                    '2. Go to *Settings > Linked Devices*.',
                    '3. Tap *Link a Device* then choose *Link with phone number*.',
                    `4. Enter this code: *${paired.code}*`,
                    '',
                    '⏳ Code expires in about 2 minutes.'
                ].join('\n')
            }, { quoted: message });
        } catch (error) {
            const msg = String(error?.message || '').toLowerCase();
            let hint = 'Try again in a few seconds.';
            if (msg.includes('timed out')) hint = 'Network slow. Retry after 10-20 seconds.';
            else if (msg.includes('429') || msg.includes('rate')) hint = 'Too many attempts. Wait 1-2 minutes.';
            else if (msg.includes('closed')) hint = 'Socket closed early. Try once more.';

            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            return await sock.sendMessage(from, { text: `❌ Pair failed: ${error.message}\n💡 ${hint}` }, { quoted: message });
        }
    }
};
