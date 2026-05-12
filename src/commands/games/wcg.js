import { registerChatHandler, clearChatHandler } from '../../handlers/messageHandler.js';

const games = {};

function nextLetter(word) {
    return word ? word.slice(-1) : 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
}

export default {
    name: 'wcg',
    aliases: ['wg', 'wordchain'],
    category: 'games',
    description: 'Word Chain Game. Type words starting with the last letter.',
    usage: 'wcg | wcg end',
    cooldown: 15,

    async execute({ sock, message, args, from, sender }) {
        if (args[0] === 'end' || args[0] === 'stop') {
            if (games[from]) {
                clearChatHandler(from);
                const g = games[from];
                delete games[from];
                return sock.sendMessage(from, {
                    text: `🏁 *Game Ended*\nRounds: ${g.round}\n${g.scores.map(s => `• ${s.name}: ${s.points}pts`).join('\n')}`
                }, { quoted: message });
            }
            return sock.sendMessage(from, { text: '❌ No active game.' }, { quoted: message });
        }

        if (games[from]) return sock.sendMessage(from, { text: '❌ Game active. Type words to play or .wcg end' }, { quoted: message });

        const game = { players: [], scores: [], round: 1, minLen: 3, lastLetter: '', turn: 0, active: true };
        games[from] = game;

        await sock.sendMessage(from, { text: `🧩 *Word Chain Started!*\n\nType any word now to join!\nRound 1: ${game.minLen}+ letters\nFirst letter: ${nextLetter('').toUpperCase()}\n\n.wcg end to stop` }, { quoted: message });

        // Register chat handler for answer detection
        registerChatHandler(from, {
            command: 'wcg',
            handler: async (text, incomingMsg) => {
                if (!games[from] || !games[from].active) { clearChatHandler(from); return false; }
                const g = games[from];
                const senderJid = incomingMsg?.key?.participant || incomingMsg?.key?.remoteJid || '';
                const word = text.trim().toLowerCase().replace(/[^a-z]/g, '');
                if (!word || word.length < g.minLen) return false;

                // Check if player exists or add them
                let pIdx = g.players.indexOf(senderJid);
                if (pIdx === -1) {
                    pIdx = g.players.length;
                    g.players.push(senderJid);
                    g.scores.push({ name: incomingMsg?.pushName || senderJid.split('@')[0], points: 0 });
                    await sock.sendMessage(from, { text: `✅ ${g.scores[pIdx].name} joined!` }, { quoted: incomingMsg });
                }

                // Check word starts with last letter
                if (g.lastLetter && word[0] !== g.lastLetter) {
                    await sock.sendMessage(from, { text: `❌ Word must start with *${g.lastLetter.toUpperCase()}*` }, { quoted: incomingMsg });
                    return true;
                }

                // Valid word
                g.lastLetter = word.slice(-1);
                g.scores[pIdx].points += word.length;
                g.turn++;

                await sock.sendMessage(from, {
                    text: `✅ ${g.scores[pIdx].name}: ${word} (+${word.length})  • Next: *${g.lastLetter.toUpperCase()}*`
                }, { quoted: incomingMsg });

                // Check round advancement
                if (g.turn >= g.players.length * 2) {
                    g.round++;
                    g.minLen = g.round + 2;
                    g.turn = 0;
                    await sock.sendMessage(from, {
                        text: `🔄 *Round ${g.round}*! Words need ${g.minLen}+ letters now!\n\nScores:\n${g.scores.map(s => `• ${s.name}: ${s.points}pts`).join('\n')}`
                    }, { quoted: incomingMsg });
                }

                return true;
            }
        });
    }
};
