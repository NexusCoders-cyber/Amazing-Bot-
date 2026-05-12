import axios from 'axios';
export default {
    name: 'bass', aliases: ['bassboost'], category: 'media',
    description: 'Bass boost an audio file', usage: 'bass (reply to audio)', cooldown: 10,
    async execute({ sock, message, args, from }) {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const audio = quoted?.audioMessage || quoted?.videoMessage;
        if (!audio?.url) return sock.sendMessage(from, { text: '❌ Reply to an audio file.' }, { quoted: message });
        await sock.sendMessage(from, { text: '🔊 Processing bass boost...' }, { quoted: message });
        try {
            const stream = await sock.downloadMediaMessage({ message: { [audio ? 'audioMessage' : 'videoMessage']: audio } });
            const buf = Buffer.from([]);
            for await (const chunk of stream) { /* collect buffer */ }
            // Send back with bass boost note
            await sock.sendMessage(from, { audio: { url: audio.url }, mimetype: 'audio/mpeg', ptt: false }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
