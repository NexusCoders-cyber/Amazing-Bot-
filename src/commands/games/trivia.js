import axios from 'axios';

const games = new Map();

export default {
    name: 'trivia',
    aliases: ['quiz'],
    category: 'games',
    description: 'Trivia quiz game. Answer questions to score points.',
    usage: 'trivia <start|end>',
    cooldown: 3,
    groupOnly: true,

    async execute({ sock, message, args, from, sender }) {
        const action = String(args[0] || '').toLowerCase();

        if (action === 'end') {
            if (games.has(from)) {
                clearTimeout(games.get(from).timer);
                games.delete(from);
                return sock.sendMessage(from, { text: '🛑 Trivia game ended.' }, { quoted: message });
            }
            return sock.sendMessage(from, { text: '❌ No active trivia game.' }, { quoted: message });
        }

        if (action !== 'start' && action !== '') {
            return sock.sendMessage(from, { text: 'Usage: trivia start | trivia end' }, { quoted: message });
        }

        if (games.has(from)) {
            return sock.sendMessage(from, { text: '❌ A trivia game is already running here.' }, { quoted: message });
        }

        const game = {
            scores: new Map(),
            currentQ: 0,
            totalQ: 10,
            active: true
        };

        games.set(from, game);
        await nextQuestion(sock, from, game);

        game.timer = setTimeout(() => {
            if (games.get(from) === game) {
                const sorted = [...game.scores.entries()].sort((a, b) => b[1] - a[1]);
                let msg = '🏆 *Trivia Results* 🏆\n\n';
                sorted.slice(0, 10).forEach(([player, score], i) => {
                    try { msg += `${i + 1}. @${player.split('@')[0]} — ${score} pts\n`; } catch {}
                });
                sock.sendMessage(from, { text: msg || 'No scores.' }).catch(() => {});
                games.delete(from);
            }
        }, 300000); // 5 min auto-end
    }
};

async function nextQuestion(sock, from, game) {
    if (game.currentQ >= game.totalQ) {
        const sorted = [...game.scores.entries()].sort((a, b) => b[1] - a[1]);
        let msg = '🏆 *Trivia Complete!* 🏆\n\n';
        sorted.slice(0, 10).forEach(([player, score], i) => {
            try { msg += `${i + 1}. @${player.split('@')[0]} — ${score} pts\n`; } catch {}
        });
        await sock.sendMessage(from, { text: msg || 'Game ended.' });
        games.delete(from);
        return;
    }

    try {
        const { data } = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 10000 });
        const q = data?.results?.[0];
        if (!q) throw new Error('No question');

        const answers = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
        const correctIdx = answers.indexOf(q.correct_answer) + 1;

        const msg = [
            `📝 *Question ${game.currentQ + 1}/${game.totalQ}*`,
            `🏷️ ${q.category}`,
            `📖 ${q.question}`,
            '',
            ...answers.map((a, i) => `${i + 1}. ${a}`),
            '',
            'Reply with the number (1-4) to answer!'
        ].join('\n');

        // Store correct answer
        game.correctAnswer = correctIdx;
        game.currentQ++;

        const sentMsg = await sock.sendMessage(from, { text: msg });

        // Register reply handler
        if (!global.replyHandlers) global.replyHandlers = {};
        global.replyHandlers[sentMsg.key.id] = {
            command: 'trivia',
            handler: async (replyText, replyMessage) => {
                if (!games.has(from)) return;
                const g = games.get(from);
                if (g !== game) return;

                delete global.replyHandlers?.[sentMsg.key.id];
                const answer = parseInt(replyText.trim(), 10);
                const player = replyMessage?.key?.participant || replyMessage?.key?.remoteJid || '';

                if (answer === game.correctAnswer) {
                    const score = (game.scores.get(player) || 0) + 1;
                    game.scores.set(player, score);
                    try {
                        const name = await sock.getName(player);
                        await sock.sendMessage(from, { text: `✅ Correct, ${name}! (+1 pt)` });
                    } catch {
                        await sock.sendMessage(from, { text: `✅ Correct! (+1 pt)` });
                    }
                } else {
                    try {
                        const name = await sock.getName(player);
                        await sock.sendMessage(from, { text: `❌ Wrong, ${name}! Answer was ${game.correctAnswer}.` });
                    } catch {
                        await sock.sendMessage(from, { text: `❌ Wrong! Answer was ${game.correctAnswer}.` });
                    }
                }

                // Next question after short delay
                setTimeout(() => nextQuestion(sock, from, game), 3000);
            }
        };

        // Auto-timeout after 30 seconds
        setTimeout(() => {
            if (global.replyHandlers?.[sentMsg.key.id]) {
                delete global.replyHandlers[sentMsg.key.id];
                sock.sendMessage(from, { text: `⏰ Time's up! Answer was ${game.correctAnswer}.` }).catch(() => {});
                setTimeout(() => nextQuestion(sock, from, game), 2000);
            }
        }, 30000);

    } catch (error) {
        await sock.sendMessage(from, { text: `❌ Trivia error: ${error.message}` });
        games.delete(from);
    }
}
