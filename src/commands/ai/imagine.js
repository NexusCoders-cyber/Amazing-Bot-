import axios from 'axios';

export default {
    name: 'imagine',
    aliases: ['texttoimage'],
    category: 'ai-image-gen',
    description: 'Generate images from text prompt and send all images',
    usage: 'imagine <prompt>',
    example: 'imagine a cat in space',
    cooldown: 5,
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

    async execute({ sock, message, args, from, prefix }) {
        try {
            const prompt = args.join(' ').trim();

            if (!prompt) {
                return await sock.sendMessage(from, {
                    text: `⚠️ Please provide a prompt.\n\n📜 *Usage:* ${prefix}imagine <prompt>\n\n🎨 *Example:* ${prefix}imagine a beautiful sunset over mountains`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            const processingMsg = await sock.sendMessage(from, {
                text: `⏳ Generating your image...`
            }, { quoted: message });

            const apiUrl = `https://theone-fast-image-gen.vercel.app/download-image?prompt=${encodeURIComponent(prompt)}&expires=${Date.now() + 10000}&size=16%3A9`;
            const response = await axios.get(apiUrl, { 
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const buffer = Buffer.from(response.data, 'binary');

            await sock.sendMessage(from, { delete: processingMsg.key });

            await sock.sendMessage(from, {
                image: buffer,
                mimetype: 'image/jpeg',
                caption: `✅ Image generation completed.\nPrompt: ${prompt}`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Image generation error:', error.message || error);
            
            await sock.sendMessage(from, {
                text: `❌ Failed to generate image.\n\n💡 Try again with a different prompt or check if the service is available.`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};