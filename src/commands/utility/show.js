import axios from 'axios';

function isUrl(value = '') {
    return /^https?:\/\//i.test(String(value).trim());
}

async function getGoogleImageFinalUrl(shortUrl) {
    try {
        const { request } = await axios.get(shortUrl, {
            maxRedirects: 5,
            timeout: 15000,
            validateStatus: () => true
        });
        return request?.res?.responseUrl || shortUrl;
    } catch {
        return shortUrl;
    }
}

export default {
    name: 'show',
    aliases: ['uploadurl', 'fetchurl'],
    category: 'utility',
    description: 'Fetch and send a media/file from direct URL',
    usage: 'show <url> or reply with a url and use show',
    cooldown: 3,
    minArgs: 0,

    async execute({ sock, message, args, from }) {
        let input = args.join(' ').trim();
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';

        if (!input && isUrl(quotedText)) input = quotedText.trim();

        if (!isUrl(input)) {
            return sock.sendMessage(from, { text: '❌ Provide a valid URL or reply to a URL message.' }, { quoted: message });
        }

        if (input.startsWith('https://images.app.goo.gl')) {
            input = await getGoogleImageFinalUrl(input);
        }

        try {
            await sock.sendMessage(from, {
                document: { url: input },
                mimetype: 'application/octet-stream',
                fileName: `show_${Date.now()}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed to fetch URL: ${error.message}` }, { quoted: message });
        }
    }
};
