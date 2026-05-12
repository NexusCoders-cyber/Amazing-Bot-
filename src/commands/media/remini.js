import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
    name: 'remini',
    category: 'tools',
    description: 'Enhance image with Remini (reply to image)',
    usage: 'remini (reply to image)',
    cooldown: 15,

    async execute({ sock, message, from }) {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.imageMessage) {
            return await sock.sendMessage(from, { text: '❌ Reply to an image' }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { text: '⏳ Uploading image...' }, { quoted: message });

            const buffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                {
                    logger: sock?.logger,
                    reuploadRequest: sock?.updateMediaMessage
                }
            );

            const { uploadToImgBB } = await import('../../utils/imgbb.js');
            const imgUrl = await uploadToImgBB(buffer);

            const reminiUrl = `https://omegatech-api.dixonomega.tech/api/tools/remini?url=${encodeURIComponent(imgUrl)}`;
            const reminiRes = await fetch(reminiUrl);
            const json = await reminiRes.json();
            const enhancedUrl = json?.result || json?.url;

            if (!reminiRes.ok || !enhancedUrl) throw new Error('No enhanced image');

            await sock.sendMessage(from, { image: { url: enhancedUrl } }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: '❌ Remini failed' }, { quoted: message });
        }

        return null;
    }
};
