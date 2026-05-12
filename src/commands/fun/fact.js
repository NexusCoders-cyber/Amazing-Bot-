import axios from 'axios';
export default {
    name: 'fact', aliases: ['randomfact'], category: 'fun',
    description: 'Get a random fact', usage: 'fact', cooldown: 3,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en', { timeout: 10000 });
            await sock.sendMessage(from, { text: `🧠 *Did you know?*\n\n${data.text}` }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '🧠 A bot can process millions of facts per second!' }, { quoted: message }); }
    }
};
