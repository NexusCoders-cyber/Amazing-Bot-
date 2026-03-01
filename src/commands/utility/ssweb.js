import axios from 'axios';

export default {
    name: 'ssweb',
    aliases: ['screenshot', 'webss'],
    category: 'utility',
    description: 'Takes a full-page screenshot of a website and sends the image.',
    usage: 'ssweb <url>',
    example: 'ssweb https://example.com',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: 1,

    async execute({ sock, message, args, from }) {
        let url = args[0];

        // Auto-fix URL if missing http
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }

        try {
            const waitMsg = await sock.sendMessage(from, {
                text: `🕵️ Taking full-page screenshot of:\n${url}`
            }, { quoted: message });

            // ScreenshotOne API endpoint for full-page screenshot
            const apiUrl = `https://api.screenshotone.com/take` +
                `?access_key=KN3bMn5VoWZIWw` +
                `&url=${encodeURIComponent(url)}` +
                `&format=jpg` +
                `&full_page=true` +         // <-- full page enabled
                `&block_ads=true` +
                `&block_cookie_banners=true` +
                `&block_trackers=true` +
                `&image_quality=80` +
                `&response_type=by_format`;

            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            const imageBuffer = Buffer.from(response.data);

            await sock.sendMessage(from, {
                image: imageBuffer,
                mimetype: 'image/jpeg',
                caption: `🖼️ Full-page screenshot of:\n${url}`
            }, { quoted: message });

            // Delete waiting message
            await sock.sendMessage(from, { delete: waitMsg.key });

        } catch (err) {
            console.error('ssweb error:', err.response?.data || err.message);

            await sock.sendMessage(from, {
                text: `❌ Failed to capture screenshot.\n\n${err.response?.data?.message || err.message}`
            }, { quoted: message });
        }
    }
};