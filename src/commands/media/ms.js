import axios from 'axios';

export default {
    name: 'ms',
    aliases: ['mangasearch', 'manga', 'searchmanga'],
    category: 'utility',
    description: 'Search for manga and display results with images.',
    usage: 'ms <query>',
    example: 'ms Gojo',
    cooldown: 7,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: Infinity,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from }) {
        const query = args.join(' ');

        if (!query.trim()) {
            return await sock.sendMessage(from, {
                text: '❗ Please provide a manga search query.'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const apiUrl = `https://arychauhann.onrender.com/api/mangasearch?query=${encodeURIComponent(query)}`;

            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;

            // Assuming API returns an array of objects like [{title, image, description, link}, ...]
            // Adjust keys based on actual API structure if known
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No manga results found');
            }

            // Send intro message
            await sock.sendMessage(from, {
                text: `📚 *Manga Search Results for:* ${query}\n\nFound ${data.length} results. Here they are:`
            }, { quoted: message });

            // Loop through results and send each neatly
            for (const [index, item] of data.entries()) {
                const title = item.title || 'Untitled';
                const description = item.description || item.synopsis || 'No description available.';
                const imageUrl = item.image || item.cover || item.thumbnail;
                const link = item.link || item.url || '';

                if (!imageUrl) continue; // Skip if no image

                const caption = `🔖 *${title}*\n\n` +
                                `${description.substring(0, 200)}${description.length > 200 ? '...' : ''}\n\n` +
                                `${link ? `🔗 [Read More](${link})` : ''}\n\n` +
                                `_Result ${index + 1}/${data.length}_`;

                await sock.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: caption
                }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (err) {
            console.error('Mangasearch command error:', err);
            await sock.sendMessage(from, {
                text: `❌ Failed to search manga: ${err.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};