import axios from 'axios';

export default {
    name: 'playstore',
    aliases: ['app', 'apk'],
    category: 'utility',
    description: 'Search for apps on Play Store and get download link',
    usage: 'playstore <app name>',
    example: 'playstore whatsapp',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: Infinity,
    typing: true,

    async execute(options) {
        const { sock, message, args, from } = options;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(from, { text: 'Please provide an app name to search.' }, { quoted: message });
        }

        try {
            const response = await axios.get(`https://arychauhann.onrender.com/api/playstore?query=${encodeURIComponent(query)}`, {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const data = response.data;
            const results = data.result || [];

            if (results.length === 0) {
                return sock.sendMessage(from, { text: `No apps found for "${query}". Try a different search term.` }, { quoted: message });
            }

            // Assuming each result has name, developer, icon, apkUrl or similar
            // Adjust based on actual structure; for now, example
            const app = results[0];
            const text = `App: ${app.name || 'Unknown'}\nDeveloper: ${app.developer || 'Unknown'}\n\nDownload: ${app.apkUrl || 'No link available'}`;

            await sock.sendMessage(from, { text }, { quoted: message });

        } catch (error) {
            console.error('Playstore error:', error);
            sock.sendMessage(from, { text: 'Error fetching app info. Try again later.' }, { quoted: message });
        }
    }
};