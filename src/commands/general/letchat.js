const TOPICS = [
    'What is one habit that changed your life?',
    'If money was not a problem, what would you build first?',
    'Drop one unpopular opinion 👀',
    'What is your dream country to visit and why?',
    'What song is on repeat for you today?',
    'What skill should everyone learn before 20?',
    'Would you choose love or money first? Explain 😄',
    'What is the best advice you ever got?'
];

export default {
    name: 'letchat',
    aliases: ['topic', 'gcstarter'],
    category: 'general',
    description: 'Send a random group conversation starter',
    usage: 'letchat',
    groupOnly: true,
    cooldown: 5,
    async execute({ sock, message, from }) {
        const q = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        return sock.sendMessage(from, { text: `🗣️ *Random Conversation Starter*\n\n${q}` }, { quoted: message });
    }
};
