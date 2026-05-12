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

            const searchUrl = `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(query)}&limit=1`;
            const searchResponse = await axios.get(searchUrl, {
                timeout: 15000,
                headers: { 'User-Agent': 'AmazingBot/1.0 (wiki command)' }
            });
            
            if (!searchResponse.data?.pages?.length) {
                await sock.sendMessage(from, {
                    text: `❌ *No results found*\n\n🔍 Query: ${query}\n💡 Tip: Try different keywords`
                }, { quoted: message });
                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
                return;
            }

            const pageTitle = searchResponse.data.pages[0].title;
            const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
            const contentResponse = await axios.get(summaryUrl, {
                timeout: 15000,
                headers: { 'User-Agent': 'AmazingBot/1.0 (wiki command)' }
            });
            const extract = contentResponse.data?.extract || 'No description available.';
            const imageUrl = contentResponse.data?.originalimage?.source || contentResponse.data?.thumbnail?.source || null;
            const pageUrl = contentResponse.data?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/\s+/g, '_'))}`;

            const truncatedExtract = extract.length > 800 ? extract.substring(0, 800) + '...' : extract;

            // Simplified text without boxes
            let wikiText = `📚 *Wikipedia: ${pageTitle}*\n\n🔗 Link: ${pageUrl}\n🌐 Language: English\n\n📝 *Summary:*\n${truncatedExtract}\n\n💡 *Info:*\n📷 Image: ${imageUrl ? 'Included' : 'Not available'}\n📊 Length: ${extract.length > 800 ? 'Truncated' : 'Full'}\n🔍 More: Visit link above\n\n💫 *Asta Bot*`;

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
