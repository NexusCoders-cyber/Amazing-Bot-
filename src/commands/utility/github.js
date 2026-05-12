import axios from 'axios';

export default {
    name: 'github',
    category: 'utility',
    description: 'Fetch GitHub user profile info',
    usage: 'github <username>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        try {
            const username = args[0].trim();
            const { data } = await axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`, { timeout: 15000 });
            await sock.sendMessage(from, {
                text: `🐙 ${data.login}\n📦 Public repos: ${data.public_repos}\n👥 Followers: ${data.followers}\n🔗 ${data.html_url}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed: ${error.message}` }, { quoted: message });
        }
    }
};
