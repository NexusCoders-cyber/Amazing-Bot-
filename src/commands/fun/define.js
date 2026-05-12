import axios from 'axios';
export default {
    name: 'define', aliases: ['dictionary', 'meaning'], category: 'fun',
    description: 'Get the definition of a word', usage: 'define <word>', cooldown: 5,
    async execute({ sock, message, args, from }) {
        const word = args.join(' ').trim();
        if (!word) return sock.sendMessage(from, { text: '❌ Usage: .define <word>' }, { quoted: message });
        try {
            const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 10000 });
            const d = data[0];
            let msg = `📖 *${d.word}*${d.phonetic ? ' (' + d.phonetic + ')' : ''}\n`;
            d.meanings.slice(0, 3).forEach(m => {
                msg += `\n*${m.partOfSpeech}*`;
                m.definitions.slice(0, 2).forEach(def => msg += `\n• ${def.definition}`);
            });
            await sock.sendMessage(from, { text: msg.slice(0, 4000) }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: `❌ No definition found for "${word}".` }, { quoted: message }); }
    }
};
