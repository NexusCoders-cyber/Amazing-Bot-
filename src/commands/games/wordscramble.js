const words = [
    { word: 'elephant', hint: 'Largest land animal' },
    { word: 'guitar', hint: 'String instrument' },
    { word: 'pizza', hint: 'Italian dish' },
    { word: 'dragon', hint: 'Mythical fire-breathing creature' },
    { word: 'sunset', hint: 'When the sun goes down' },
    { word: 'basket', hint: 'Used for carrying items' },
    { word: 'castle', hint: 'A royal building' },
    { word: 'flower', hint: 'A bloom on a plant' },
    { word: 'pillow', hint: 'Something you sleep on' },
    { word: 'jungle', hint: 'Dense forest' }
];

const games = new Map();

function shuffle(word) {
    const arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
}

export default {
    name: 'wordscramble',
    aliases: ['scramble', 'unscramble'],
    category: 'games',
    description: 'Unscramble the word! Use the hint to guess it.',
    usage: 'wordscramble',
    cooldown: 3,
    groupOnly: true,

    async execute({ sock, message, args, from }) {
        if (games.has(from)) {
            return sock.sendMessage(from, { text: '❌ A scramble game is already running.' }, { quoted: message });
        }

        const game = { };
        const q = words[Math.floor(Math.random() * words.length)];
        const scrambled = shuffle(q.word);
        game.answer = q.word;

        games.set(from, game);

        const msg = [
            '🔤 *Word Scramble*',
            '',
            `Scrambled: *${scrambled.toUpperCase()}*`,
            `Hint: ${q.hint}`,
            '',
            'Reply with your answer!'
        ].join('\n');

        const sentMsg = await sock.sendMessage(from, { text: msg }, { quoted: message });

        if (!global.replyHandlers) global.replyHandlers = {};
        global.replyHandlers[sentMsg.key.id] = {
            command: 'wordscramble',
            handler: async (replyText, replyMessage) => {
                if (!games.has(from)) return;
                delete global.replyHandlers?.[sentMsg.key.id];
                games.delete(from);

                const guess = replyText.trim().toLowerCase();
                if (guess === game.answer) {
                    const player = replyMessage?.key?.participant || replyMessage?.key?.remoteJid || '';
                    try {
                        const name = await sock.getName(player);
                        await sock.sendMessage(from, { text: `🎉 ${name} got it! The word was *${game.answer}*!` });
                    } catch {
                        await sock.sendMessage(from, { text: `🎉 Correct! The word was *${game.answer}*!` });
                    }
                } else {
                    await sock.sendMessage(from, { text: `❌ Wrong! The word was *${game.answer}*.` });
                }
            }
        };

        setTimeout(() => {
            if (global.replyHandlers?.[sentMsg.key.id]) {
                delete global.replyHandlers[sentMsg.key.id];
                games.delete(from);
                sock.sendMessage(from, { text: `⏰ Time's up! The word was *${game.answer}*.` }).catch(() => {});
            }
        }, 60000);
    }
};
