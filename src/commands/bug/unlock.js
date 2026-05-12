import { checkPremiumPassword, addPremiumUser, isPremiumUser } from '../../utils/premiumStore.js';

export default {
    name: 'unlock',
    aliases: ['premium', 'activate', 'unlockpremium'],
    category: 'bug',
    description: 'Unlock premium/bug commands with passcode',
    usage: 'unlock <passcode>',
    cooldown: 10,

    async execute({ sock, message, args, from, sender }) {
        const code = args.join(' ').trim();
        if (!code) {
            return sock.sendMessage(from, { text: '❌ Usage: .unlock <passcode>\nContact owner for passcode.' }, { quoted: message });
        }

        if (isPremiumUser(sender)) {
            return sock.sendMessage(from, { text: '✅ You already have premium access.' }, { quoted: message });
        }

        if (checkPremiumPassword(code)) {
            addPremiumUser(sender);
            await sock.sendMessage(from, { text: '✅ *Premium Unlocked!*\n\nYou now have access to:\n• Bug commands (.bug, .groupbug)\n• All premium features\n\nEnjoy! 💀' }, { quoted: message });
        } else {
            await sock.sendMessage(from, { text: '❌ Invalid passcode. Contact owner.' }, { quoted: message });
        }
    }
};
