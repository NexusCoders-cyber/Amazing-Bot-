import axios from 'axios';

export default {
    name: 'npm',
    category: 'utility',
    description: 'Fetch npm package info',
    usage: 'npm <package-name>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        try {
            const pkg = args[0].trim();
            const { data } = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`, { timeout: 15000 });
            await sock.sendMessage(from, {
                text: `📦 ${data.name}\n🏷️ Latest: ${data?.['dist-tags']?.latest || 'unknown'}\n📝 ${data.description || 'No description'}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed: ${error.message}` }, { quoted: message });
        }
    }
};
