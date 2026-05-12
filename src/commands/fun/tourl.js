import axios from 'axios';
export default {
    name: 'tourl', aliases: ['upload'], category: 'fun',
    description: 'Upload media and get a direct link', usage: 'tourl (reply to media)', cooldown: 10,
    async execute({ sock, message, args, from }) {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const media = quoted?.imageMessage || quoted?.videoMessage || quoted?.documentMessage;
        if (!media) return sock.sendMessage(from, { text: '❌ Reply to media.' }, { quoted: message });
        await sock.sendMessage(from, { text: '📤 Uploading...' }, { quoted: message });
        try {
            const stream = await sock.downloadMediaMessage({ message: { [media === quoted?.imageMessage ? 'imageMessage' : media === quoted?.videoMessage ? 'videoMessage' : 'documentMessage']: media } });
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            const b64 = buffer.toString('base64');
            const { data } = await axios.post('https://api.davidcyril.name.ng/upload', { file: b64 }, { timeout: 30000 });
            await sock.sendMessage(from, { text: `🔗 *Link:* ${data?.url || data?.link || 'Upload failed'}` }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Upload failed.' }, { quoted: message }); }
    }
};
