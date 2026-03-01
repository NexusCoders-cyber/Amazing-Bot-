import axios from 'axios';

export default {
    name: 'weather',
    aliases: ['forecast', 'temp'],
    category: 'utility',
    description: 'Get weather information for a specified location',
    usage: 'weather <location>',
    example: 'weather Lagos',
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
    supportsChat: true,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const location = args.join(' ').trim();
            if (!location) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nPlease provide a location.\n\n📜 *Usage*: \`${prefix}weather <location>\`\n🎯 *Example*: \`${prefix}weather Lagos\``
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, { react: { text: '☁️', key: message.key } });
            const processMessage = await sock.sendMessage(from, {
                text: `☁️ *Fetching Weather*: ${location}...`
            }, { quoted: message });

            const response = await axios.get(`https://kaiz-apis.gleeze.com/api/weather?q=${encodeURIComponent(location)}&apikey=a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea`, { timeout: 10000 });
            const weatherData = response.data;

            if (!weatherData || !weatherData.location) {
                await sock.sendMessage(from, { delete: processMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nNo weather data found for "${location}".\n\n💡 Try another location!`
                }, { quoted: message });
                return;
            }

            const reply = `☁️ *Weather for ${weatherData.location}*\n\n` +
                          `- *Temperature*: ${weatherData.temperature}°C\n` +
                          `- *Condition*: ${weatherData.condition || 'N/A'}\n` +
                          `- *Humidity*: ${weatherData.humidity || 'N/A'}%\n` +
                          `- *Wind Speed*: ${weatherData.windSpeed || 'N/A'} km/h\n` +
                          `- *Description*: ${weatherData.description || 'N/A'}\n`;

            await sock.sendMessage(from, { delete: processMessage.key });
            await sock.sendMessage(from, { text: reply }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('Weather command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch weather data: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
