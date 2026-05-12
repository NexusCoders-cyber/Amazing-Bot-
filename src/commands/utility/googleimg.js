import gis from 'g-i-s';

function searchImages(query) {
    return new Promise((resolve, reject) => {
        gis(query, (error, results) => {
            if (error) return reject(error);
            resolve(results || []);
        });
    });
}

export default {
    name: 'googleimg',
    aliases: ['gimg'],
    category: 'utility',
    description: 'Search Google Images and return image links',
    usage: 'googleimg <query>',
    example: 'googleimg naruto wallpaper',
    cooldown: 8,
    permissions: ['user'],
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const query = args.join(' ').trim();
        if (!query) {
            await sock.sendMessage(from, { text: '❌ Usage: googleimg <query>' }, { quoted: message });
            return;
        }

        try {
            const results = await searchImages(query);
            if (!results.length) {
                await sock.sendMessage(from, { text: 'No image results found.' }, { quoted: message });
                return;
            }

            const top = results.slice(0, 8).map((item, idx) => `${idx + 1}. ${item.url || item.preview?.url || 'N/A'}`);
            await sock.sendMessage(from, {
                text: `Top image results for: ${query}\n\n${top.join('\n')}`
            }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: '❌ Failed to fetch image results.' }, { quoted: message });
        }
    }
};
