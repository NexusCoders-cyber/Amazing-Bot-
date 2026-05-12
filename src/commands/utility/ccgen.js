import axios from 'axios';
import { getUser } from '../../utils/economyStorage.js';

const allowedTypes = ['Visa', 'MasterCard', 'American Express', 'JCB'];
const userLimits = {};

function canonicalType(input) {
    if (!input) return null;
    const norm = input.replace(/[\s\-_.]/g, '').toLowerCase();
    for (const type of allowedTypes) {
        if (type.replace(/[\s\-_.]/g, '').toLowerCase() === norm) return type;
        if (norm === 'amex' && type === 'American Express') return type;
    }
    return null;
}

function getLimitByRank(rank) {
    switch ((rank || '').toUpperCase()) {
        case 'PREMIUM': return 20;
        case 'OWNER':
        case 'ADMIN': return 3;
        default: return 90;
    }
}

function box(text) {
    return `*╔════〔 𝐜𝐜𝐠𝐞𝐧 〕═══╗*\n${text}\n╚════════════════════╝`;
}

function sendOptions() {
    return {};
}

export default {
    name: 'ccgen',
    aliases: ['cardgen'],
    category: 'utility',
    description: 'Fake card generator .ccgen <type> <amount>',
    usage: 'ccgen <type> <amount>',
    cooldown: 2,

    async execute({ sock, message, from, args, sender, isOwner, isSudo }) {
        const [rawType, amt] = args;
        const amount = Math.max(5, Math.min(parseInt(amt, 10) || 5, 20));
        const type = canonicalType(rawType);

        if (!rawType) {
            return sock.sendMessage(from, {
                text: box([
                    '┃  *Usage*: .ccgen <type> <amount>',
                    `┃  *Types*: ${allowedTypes.join(', ')}`
                ].join('\n')),
                ...sendOptions()
            }, { quoted: message });
        }

        if (!type) {
            return sock.sendMessage(from, {
                text: box([
                    `┃  *Error*: invalid card type "${rawType}"`,
                    `┃  *Types*: ${allowedTypes.join(', ')}`
                ].join('\n')),
                ...sendOptions()
            }, { quoted: message });
        }

        const chatId = sender || from || 'anon';
        let userRank = 'FREE';

        if (isOwner) userRank = 'OWNER';
        else if (isSudo) userRank = 'ADMIN';
        else {
            const user = await getUser(sender).catch(() => null);
            if (user?.isPremium) userRank = 'PREMIUM';
        }

        const now = Date.now();
        const waitSec = getLimitByRank(userRank);
        const until = userLimits[chatId] || 0;
        if (now < until) {
            const diff = Math.ceil((until - now) / 1000);
            return sock.sendMessage(from, {
                text: box([
                    `┃  *Rate limited*: wait ${diff}s`,
                    `┃  *Rank*: ${userRank}`
                ].join('\n')),
                ...sendOptions()
            }, { quoted: message });
        }

        try {
            const apiUrl = `https://apis.davidcyril.name.ng/tools/ccgen?type=${encodeURIComponent(type)}&amount=${amount}`;
            const { data } = await axios.get(apiUrl, { timeout: 10000 });
            if (!data?.status || !Array.isArray(data.cards) || data.cards.length === 0) {
                throw new Error('Could not generate cards');
            }

            userLimits[chatId] = Date.now() + (waitSec * 1000);

            const cardsText = data.cards.map((card) => [
                `┃  *Name*: ${card.name}`,
                `┃  *Number*: \`${card.number}\``,
                `┃  *Expiry*: \`${card.expiry}\``,
                `┃  *CVV*: \`${card.cvv}\``,
                '┃'
            ].join('\n')).join('\n');

            return sock.sendMessage(from, {
                text: box([
                    `┃  *Card type*: ${data.card_type || type}`,
                    `┃  *Total*: ${data.total || data.cards.length}`,
                    cardsText
                ].join('\n')),
                ...sendOptions()
            }, { quoted: message });
        } catch (e) {
            return sock.sendMessage(from, {
                text: box([
                    `┃  *Error*: ${e.response?.data?.message || e.message || 'unknown'}`
                ].join('\n')),
                ...sendOptions()
            }, { quoted: message });
        }
    }
};
