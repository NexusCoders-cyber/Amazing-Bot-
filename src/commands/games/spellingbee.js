import { getUser, createUser, updateUser } from '../../utils/economyStorage.js';

const words = [
    'accommodation', 'acknowledgment', 'acquaintance', 'achievement', 'aggressive',
    'apparent', 'argument', 'beautiful', 'beginning', 'believe',
    'calendar', 'camouflage', 'cemetery', 'chauffeur', 'colleague',
    'conscience', 'conscious', 'consensus', 'courageous', 'curiosity',
    'definitely', 'discipline', 'embarrass', 'environment', 'exaggerate',
    'excellent', 'experience', 'fascinating', 'familiar', 'foreign',
    'friendship', 'gauge', 'government', 'grateful', 'guarantee',
    'harassment', 'height', 'hierarchy', 'humorous', 'ignorance',
    'immediately', 'independent', 'indispensable', 'intelligence', 'jewelry',
    'judgment', 'knowledge', 'language', 'leisure', 'liaison',
    'library', 'maintenance', 'maneuver', 'medieval', 'millennium',
    'necessary', 'neighbor', 'noticeable', 'occasionally', 'occurrence',
    'parallel', 'parliament', 'perseverance', 'personnel', 'phenomenon',
    'possession', 'privilege', 'pronunciation', 'questionnaire', 'recommend',
    'reference', 'rehearsal', 'relevant', 'restaurant', 'rhythm',
    'schedule', 'separate', 'signature', 'successful', 'supersede',
    'surprise', 'threshold', 'tomorrow', 'twelfth', 'vacuum',
    'weird', 'withhold'
];

function senderJid(message) {
    return message?.key?.participant || message?.key?.remoteJid || '';
}

export default {
    name: 'spellingbee',
    aliases: ['spellbee', 'spell'],
    category: 'games',
    description: 'Listen to the audio and spell the word correctly to win credits',
    usage: 'spellingbee',
    cooldown: 5,

    async execute({ sock, message, from, sender }) {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(randomWord)}&tl=en&client=tw-ob`;

        await sock.sendMessage(from, { react: { text: '🐝', key: message.key } });

        const sentAudio = await sock.sendMessage(from, {
            audio: { url: ttsUrl },
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: message });

        const promptMsg = await sock.sendMessage(from, {
            text: '⬆️ *Spelling Bee Alert!*\n\nListen to the audio above. It will disappear in 15 seconds. Reply to *this message* with the correct spelling to win *500 credits*!'
        }, { quoted: message });

        if (!global.replyHandlers) global.replyHandlers = {};
        global.replyHandlers[promptMsg.key.id] = {
            command: 'spellingbee',
            handler: async (replyText, replyMessage) => {
                const replySender = senderJid(replyMessage);
                if (replySender !== sender) return;

                const userAnswer = String(replyText || '').trim().toLowerCase();
                const correctAnswer = randomWord.toLowerCase();

                if (userAnswer === correctAnswer) {
                    try {
                        let user = await getUser(sender);
                        if (!user) user = await createUser({ jid: sender });

                        const reward = 500;
                        const newBalance = (user.economy?.balance || 0) + reward;
                        await updateUser(sender, { 'economy.balance': newBalance });

                        await sock.sendMessage(from, { react: { text: '✅', key: replyMessage.key } });
                        await sock.sendMessage(from, {
                            text: `🎉 *Correct!* The word was *${correctAnswer}*.\n💰 +${reward} credits added to your balance!`
                        }, { quoted: replyMessage });
                    } catch {
                        await sock.sendMessage(from, {
                            text: 'Correct, but there was an error updating your credits.'
                        }, { quoted: replyMessage });
                    }
                } else {
                    await sock.sendMessage(from, { react: { text: '❌', key: replyMessage.key } });
                    await sock.sendMessage(from, {
                        text: `❌ *Wrong!* The correct spelling was *${correctAnswer}*.`
                    }, { quoted: replyMessage });
                }

                delete global.replyHandlers[promptMsg.key.id];
            }
        };

        setTimeout(async () => {
            try {
                await sock.sendMessage(from, { delete: sentAudio.key });
            } catch {}
        }, 15000);

        setTimeout(() => {
            if (global.replyHandlers?.[promptMsg.key.id]?.command === 'spellingbee') {
                delete global.replyHandlers[promptMsg.key.id];
            }
        }, 60000);
    }
};
