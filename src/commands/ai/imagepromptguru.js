import axios from 'axios';

function getQuotedImageUrl(message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    return quoted?.imageMessage?.url || null;
}

export default {
    name: 'imagepromptguru',
    aliases: ['imgprompt', 'promptguru'],
    category: 'ai',
    description: 'Generate detailed prompt from image URL using ImagePromptGuru API',
    usage: 'imagepromptguru [model] [lang] (reply to an image)',
    cooldown: 5,

    async execute({ sock, message, from, args }) {
        try {
            const imageUrl = getQuotedImageUrl(message) || args.find((a) => /^https?:\/\//i.test(a));
            if (!imageUrl) {
                return await sock.sendMessage(from, { text: '❌ Reply to an image or provide image URL.' }, { quoted: message });
            }
            const model = args[0] && !/^https?:\/\//i.test(args[0]) ? args[0] : 'Anime';
            const lang = args[1] && !/^https?:\/\//i.test(args[1]) ? args[1] : 'English';
            const { data } = await axios.get('https://arychauhann.onrender.com/api/imagepromptguru', {
                params: { imageUrl, model, lang },
                timeout: 90000
            });
            const result = data?.prompt || data?.result?.prompt || data?.result || data?.data || '';
            if (!result) throw new Error('No prompt generated');
            return await sock.sendMessage(from, {
                text: `🧠 ImagePromptGuru\nModel: ${model}\nLanguage: ${lang}\n\n${String(result).replace(/\*/g, '')}`
            }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, { text: `❌ imagepromptguru failed: ${error.message}` }, { quoted: message });
        }
    }
};
