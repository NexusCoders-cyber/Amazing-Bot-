import { fetchAllInOneDownload, parseAllInOneMeta, pickBestMedia } from '../../utils/allInOneDownloader.js';

export default {
    name: 'tgdl',
    aliases: ['telegramdl', 'tgmedia'],
    category: 'downloader',
    description: 'Download Telegram media from post link',
    usage: 'tgdl <telegram-link>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const url = args[0];
            const data = await fetchAllInOneDownload(url);
            const mediaUrl = pickBestMedia(data, 'video') || pickBestMedia(data, 'audio');
            if (!mediaUrl) throw new Error('No download result');
            const meta = parseAllInOneMeta(data);
            const isVideo = /\.mp4|video/i.test(mediaUrl);
            if (isVideo) {
                await sock.sendMessage(from, { video: { url: mediaUrl }, caption: `✅ Telegram media\n\n🎬 ${meta.title}` }, { quoted: message });
            } else {
                await sock.sendMessage(from, { document: { url: mediaUrl }, fileName: 'telegram-media' }, { quoted: message });
            }
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ tgdl failed: ${error.message}` }, { quoted: message });
        }
    }
};
