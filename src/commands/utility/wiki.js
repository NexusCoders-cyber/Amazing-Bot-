import axios from 'axios';

export default {
    name: 'wiki',
    aliases: ['wikipedia', 'wikisearch', 'search'],
    category: 'utility',
    description: 'Search Wikipedia and get detailed information with images',
    usage: 'wiki <search query>',
    example: 'wiki Albert Einstein\nwiki Artificial Intelligence',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: 50,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const query = args.join(' ');

            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
            const searchResponse = await axios.get(searchUrl);
            
            if (!searchResponse.data.query.search || searchResponse.data.query.search.length === 0) {
                await sock.sendMessage(from, {
                    text: `❌ *No results found*\n\n🔍 Query: ${query}\n💡 Tip: Try different keywords`
                }, { quoted: message });
                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
                return;
            }

            const pageTitle = searchResponse.data.query.search[0].title;
            const pageId = searchResponse.data.query.search[0].pageid;

            const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro&explaintext&piprop=original&pageids=${pageId}&format=json`;
            const contentResponse = await axios.get(contentUrl);
            
            const page = contentResponse.data.query.pages[pageId];
            const extract = page.extract || 'No description available.';
            const imageUrl = page.original?.source || null;
            const pageUrl = `https://en.wikipedia.org/?curid=${pageId}`;

            const truncatedExtract = extract.length > 800 ? extract.substring(0, 800) + '...' : extract;

            // Simplified text without boxes
            let wikiText = `📚 *Wikipedia: ${pageTitle}*\n\n🔗 Link: ${pageUrl}\n🌐 Language: English\n\n📝 *Summary:*\n${truncatedExtract}\n\n💡 *Info:*\n📷 Image: ${imageUrl ? 'Included' : 'Not available'}\n📊 Length: ${extract.length > 800 ? 'Truncated' : 'Full'}\n🔍 More: Visit link above\n\n💫 *Ilom Bot*`;

            if (imageUrl) {
                await sock.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: wikiText
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, {
                    text: wikiText
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Wikipedia search error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Search failed*\n\n⚠️ Details: ${error.message}\n💡 Tip: Try again later`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};