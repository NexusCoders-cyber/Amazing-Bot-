import axios from 'axios';
export default {
    name: 'joke', aliases: ['dadjoke'], category: 'fun',
    description: 'Get a random joke', usage: 'joke', cooldown: 3,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist', { timeout: 10000 });
            const joke = data.type === 'twopart' ? `${data.setup}\n\n${data.delivery}` : data.joke;
            await sock.sendMessage(from, { text: `😂 ${joke}` }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '😂 Why did the bot cross the road? To send you this joke!' }, { quoted: message }); }
    }
};
