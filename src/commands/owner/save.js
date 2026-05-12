import config from '../../config.js';

export default {
    name: 'save',
    aliases: ['savemedia'],
    category: 'owner',
    description: 'Forward replied image/video to owner DM',
    usage: 'save (reply image/video)',
    ownerOnly: true,

    async execute({ sock, message, from }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        if (!quoted?.imageMessage && !quoted?.videoMessage) {
            return await sock.sendMessage(from, { text: '❌ Reply to an image or video.' }, { quoted: message });
        }

        const owner = config.ownerNumbers?.[0];
        if (!owner) {
            return await sock.sendMessage(from, { text: '❌ No owner number configured.' }, { quoted: message });
        }

        if (quoted?.imageMessage) {
            const imageBuffer = await sock.downloadMediaMessage({ message: { imageMessage: quoted.imageMessage } });
            await sock.sendMessage(owner, { image: imageBuffer, caption: 'Saved media from group/chat.' });
        } else {
            const videoBuffer = await sock.downloadMediaMessage({ message: { videoMessage: quoted.videoMessage } });
            await sock.sendMessage(owner, { video: videoBuffer, caption: 'Saved media from group/chat.' });
        }

        await sock.sendMessage(from, { text: `✅ Saved to owner DM (${owner.split('@')[0]}).` }, { quoted: message });
    }
};
