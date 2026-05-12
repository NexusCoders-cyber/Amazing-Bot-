export default {
    name: 'vv',
    aliases: ['viewonce', 'damn', 'screamingbeauty', 'sb'],
    noPrefix: true,
    category: 'media',
    description: 'Download and forward a view-once media to your DM',
    usage: 'vv (reply to viewonce media)',
    cooldown: 5,

    async execute({ sock, message, args, from, sender }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;

        if (!quoted) return sock.sendMessage(from, { text: '❌ Reply to a view-once image/video.' }, { quoted: message });

        const img = quoted.imageMessage;
        const vid = quoted.videoMessage;

        const media = img || vid;
        if (!media) return sock.sendMessage(from, { text: '❌ No view-once media found.' }, { quoted: message });

        const type = img ? 'image' : 'video';

        try {
            const stream = await sock.downloadMediaMessage({ message: { [(img ? 'imageMessage' : 'videoMessage')]: media } });
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // Send to CALLER's DM
            await sock.sendMessage(sender, {
                [type]: buffer,
                caption: '📥 ViewOnce saved'
            });
        } catch {
            await sock.sendMessage(from, { text: '❌ Failed to download.' }, { quoted: message });
        }
    }
};
