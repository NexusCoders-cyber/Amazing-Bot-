const dares = [
  "Send a random emoji to your ex", "Do 20 pushups right now", "Send your last screenshot to someone",
  "Sing a song and record it", "Text your mom 'I love you'", "Change your profile pic to something weird for 1 hour",
  "Call a random contact and say 'wrong number'", "Post an embarrassing selfie", "Let someone write a status for you",
  "Do a funny dance and send a video"
];
export default {
    name: 'dare', aliases: [], category: 'fun',
    description: 'Get a random dare', usage: 'dare', cooldown: 3,
    async execute({ sock, message, from }) {
        await sock.sendMessage(from, { text: '😈 *Dare:* ' + dares[Math.floor(Math.random() * dares.length)] }, { quoted: message });
    }
};
