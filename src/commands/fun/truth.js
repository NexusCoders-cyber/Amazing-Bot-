const truths = [
  "What's your biggest fear?", "Have you ever lied to your best friend?", "What's the most embarrassing thing you've done?",
  "Who do you secretly hate?", "What's your biggest regret?", "Have you ever stolen something?",
  "What's the worst date you've been on?", "What's a secret you've never told anyone?",
  "Who was your first crush?", "What's the most illegal thing you've done?"
];
export default {
    name: 'truth', aliases: [], category: 'fun',
    description: 'Get a random truth question', usage: 'truth', cooldown: 3,
    async execute({ sock, message, from }) {
        await sock.sendMessage(from, { text: '🤔 *Truth:* ' + truths[Math.floor(Math.random() * truths.length)] }, { quoted: message });
    }
};
