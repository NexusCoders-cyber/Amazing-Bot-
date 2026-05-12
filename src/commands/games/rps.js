const choices = ['rock', 'paper', 'scissors'];

function pick() {
    return choices[Math.floor(Math.random() * choices.length)];
}

function result(user, bot) {
    if (user === bot) return 'draw';
    if (
        (user === 'rock' && bot === 'scissors')
        || (user === 'paper' && bot === 'rock')
        || (user === 'scissors' && bot === 'paper')
    ) return 'win';
    return 'lose';
}

export default {
    name: 'rps',
    aliases: ['rockpaper', 'rockpaperscissors'],
    category: 'games',
    description: 'Play Rock Paper Scissors against the bot',
    usage: 'rps <rock|paper|scissors>',
    cooldown: 2,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const userChoice = String(args[0] || '').toLowerCase();
        if (!choices.includes(userChoice)) {
            return sock.sendMessage(from, { text: '❌ Usage: .rps <rock|paper|scissors>' }, { quoted: message });
        }
        const botChoice = pick();
        const state = result(userChoice, botChoice);
        const msg = state === 'win' ? '🎉 You win!' : state === 'lose' ? '😅 You lose!' : '🤝 Draw!';
        return sock.sendMessage(from, {
            text: `🪨 Rock Paper Scissors\n\nYou: ${userChoice}\nBot: ${botChoice}\n\n${msg}`
        }, { quoted: message });
    }
};
