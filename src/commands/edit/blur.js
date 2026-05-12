import axios from 'axios';
export default {
    name: 'blur', aliases: ['blurimage'], category: 'edit',
    description: 'Blur an image (reply to image)', usage: 'blur', cooldown: 5,
    async execute({ sock, message, from }) {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const img = quoted?.imageMessage;
        if (!img?.url) return sock.sendMessage(from, { text: '❌ Reply to an image.' }, { quoted: message });
        try {
            const stream = await sock.downloadMediaMessage({ message: { imageMessage: img } });
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            const b64 = buffer.toString('base64');
            const { data } = await axios.post('https://apis.prexzyvilla.site/edit/blur', { image: b64 }, { responseType: 'arraybuffer', timeout: 30000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '🌫️ Blurred' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
