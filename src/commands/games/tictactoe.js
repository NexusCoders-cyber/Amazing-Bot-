import TicTacToe from '../../utils/tictactoe.js';

const games = {};

function mention(jid) {
    return `@${String(jid || '').split('@')[0]}`;
}

function senderJid(message) {
    return message?.key?.participant || message?.key?.remoteJid || '';
}

function setChatHandler(chatId, handler) {
    if (!global.chatHandlers) global.chatHandlers = {};
    global.chatHandlers[chatId] = { command: 'tictactoe', handler };
}

function clearChatHandler(chatId) {
    if (global.chatHandlers?.[chatId]) delete global.chatHandlers[chatId];
}

function renderBoard(game) {
    const arr = game.render().map((v) => ({
        X: '❎',
        O: '⭕',
        1: '1️⃣',
        2: '2️⃣',
        3: '3️⃣',
        4: '4️⃣',
        5: '5️⃣',
        6: '6️⃣',
        7: '7️⃣',
        8: '8️⃣',
        9: '9️⃣'
    }[v]));
    return `${arr.slice(0, 3).join('')}\n${arr.slice(3, 6).join('')}\n${arr.slice(6).join('')}`;
}

function cleanupRoom(roomId) {
    const room = games[roomId];
    if (!room) return;
    clearChatHandler(room.x);
    delete games[roomId];
}

async function handleMove(sock, msg, from) {
    const sender = senderJid(msg);
    const text = String(msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
    const room = Object.values(games).find((r) =>
        r.id.startsWith('tictactoe') && [r.game.playerX, r.game.playerO].includes(sender) && r.state === 'PLAYING' && r.x === from
    );

    if (!room) return false;

    const isSurrender = /^(surrender|give up)$/i.test(text);
    if (!isSurrender && !/^[1-9]$/.test(text)) return false;

    if (sender !== room.game.currentTurn && !isSurrender) {
        await sock.sendMessage(from, { text: '❌ Not your turn!' }, { quoted: msg });
        return true;
    }

    const ok = isSurrender ? true : room.game.turn(sender === room.game.playerO, Number.parseInt(text, 10) - 1);
    if (!ok) {
        await sock.sendMessage(from, { text: '❌ Invalid move! Position already taken.' }, { quoted: msg });
        return true;
    }

    let winner = room.game.winner;
    const isTie = room.game.turns === 9 && !winner;

    if (isSurrender) {
        winner = sender === room.game.playerX ? room.game.playerO : room.game.playerX;
        await sock.sendMessage(from, {
            text: `🏳️ ${mention(sender)} surrendered! ${mention(winner)} wins!`,
            mentions: [sender, winner]
        }, { quoted: msg });
        cleanupRoom(room.id);
        return true;
    }

    const status = winner
        ? `🎉 ${mention(winner)} wins the game!`
        : isTie
            ? '🤝 Game ended in a draw!'
            : `🎲 Turn: ${mention(room.game.currentTurn)}`;

    const board = [
        '🎮 *TicTacToe*',
        '',
        status,
        '',
        renderBoard(room.game),
        '',
        `▢ Player ❎: ${mention(room.game.playerX)}`,
        `▢ Player ⭕: ${mention(room.game.playerO)}`,
        !winner && !isTie ? '\n• Type a number (1-9)\n• Type *surrender* to quit' : ''
    ].join('\n');

    const mentions = [room.game.playerX, room.game.playerO, winner || room.game.currentTurn].filter(Boolean);

    await sock.sendMessage(from, { text: board, mentions }, { quoted: msg });

    if (winner || isTie) cleanupRoom(room.id);
    return true;
}

export default {
    games,
    name: 'tictactoe',
    aliases: ['ttt', 'xo'],
    category: 'games',
    description: 'Play TicTacToe with another player - type .ttt to start or join',
    usage: 'ttt [room name]',
    groupOnly: true,
    cooldown: 3,

    async execute({ sock, message, args, from, sender }) {
        const text = args.join(' ').trim();

        const existingRoom = Object.values(games).find((room) =>
            room.id.startsWith('tictactoe') && [room.game.playerX, room.game.playerO].includes(sender)
        );
        if (existingRoom && existingRoom.state === 'PLAYING') {
            await sock.sendMessage(from, { text: '❌ You are already in a game. Type *surrender*.' }, { quoted: message });
            return;
        }

        let room = Object.values(games).find((r) =>
            r.state === 'WAITING' && r.id.startsWith('tictactoe') && r.x === from && (text ? r.name === text : !r.name)
        );

        if (room) {
            room.o = from;
            room.game.playerO = sender;
            room.state = 'PLAYING';

            const startText = [
                '🎮 *TicTacToe Game Started!*',
                '',
                `Waiting for ${mention(room.game.currentTurn)} to play...`,
                '',
                renderBoard(room.game),
                '',
                `▢ Room ID: ${room.id}`,
                '• Type a number (1-9) to play',
                '• Type *surrender* to quit'
            ].join('\n');

            await sock.sendMessage(from, {
                text: startText,
                mentions: [room.game.currentTurn, room.game.playerX, room.game.playerO]
            }, { quoted: message });

            setChatHandler(from, async (incomingText, incomingMsg) => {
                const prefixed = String(incomingText || '').trim().startsWith('.');
                if (prefixed) return;
                await handleMove(sock, incomingMsg, from);
            });
            return;
        }

        room = {
            id: `tictactoe-${Date.now()}`,
            x: from,
            o: '',
            game: new TicTacToe(sender, null),
            state: 'WAITING'
        };

        if (text) room.name = text;
        games[room.id] = room;

        await sock.sendMessage(from, {
            text: `⏳ *Waiting for opponent*\nType *.ttt ${text || ''}* to join!`
        }, { quoted: message });
    }
};

export async function handleTicTacToeMove(sock, msg, extra = {}) {
    const from = extra.from || msg?.key?.remoteJid;
    if (!from) return false;
    return handleMove(sock, msg, from);
}
