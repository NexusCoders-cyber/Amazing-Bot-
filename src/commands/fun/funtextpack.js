const RESPONSES = {
    compliment: ["You're awesome!", 'You make this chat better.', 'You have elite energy.'],
    roast: ['Your Wi-Fi is faster than your comebacks.', 'Even autocorrect gave up on you.'],
    trivia: ['Trivia: Honey never spoils.', 'Trivia: Octopuses have three hearts.'],
    truth: ['Truth: What is one thing you hide from people?', 'Truth: Who was your first crush?'],
    dare: ['Dare: Send a random emoji story.', 'Dare: Use only uppercase for 5 minutes.'],
    meme: ['Meme mode: 404 motivation not found.', 'Meme mode: I paused my game for this?'],
    advice: ['Small steps daily beat big plans yearly.', 'Sleep, water, and consistency fix half of life.'],
    urban: ['Urban result: check urban dictionary for latest meaning.'],
    moviequote: ['"Why so serious?"', '"May the Force be with you."'],
    triviafact: ['Fact: Bananas are berries, strawberries are not.'],
    ascii: ['(\_/)', '( •_•)', '/ >🍪'],
    progquote: ['"First, solve the problem. Then, write the code."'],
    dadjoke: ["Why don't eggs tell jokes? They crack each other up."],
    prog: ['Programmer humor: It works on my machine.'],
    quotememe: ['"I can explain" - every developer after prod crash.'],
    fact: ['Sharks existed before trees.'],
    poem: ['Roses are red, code can be blue, tests are all green, deploy it too.']
};

const COMMANDS = Object.keys(RESPONSES);

function getBody(message) {
    return message?.message?.conversation
        || message?.message?.extendedTextMessage?.text
        || message?.message?.imageMessage?.caption
        || message?.message?.videoMessage?.caption
        || '';
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export default {
    name: 'compliment',
    aliases: COMMANDS.filter(c => c !== 'compliment'),
    category: 'fun',
    description: 'Collection of quick fun text commands',
    usage: 'compliment',
    cooldown: 3,

    async execute({ sock, message, from, prefix }) {
        const body = getBody(message).trim();
        const invoked = body.startsWith(prefix)
            ? body.slice(prefix.length).split(/\s+/)[0].toLowerCase()
            : 'compliment';
        const key = COMMANDS.includes(invoked) ? invoked : 'compliment';
        await sock.sendMessage(from, { text: pick(RESPONSES[key]) }, { quoted: message });
    }
};
