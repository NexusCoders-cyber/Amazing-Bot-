import axios from 'axios';

export default {
    name: 'github',
    aliases: ['gh', 'git'],
    category: 'scraper',
    description: 'Get GitHub user profile info and repos',
    usage: 'github <username>',
    cooldown: 5,

    async execute({ sock, message, args, from }) {
        const username = args.join(' ').trim();
        if (!username) {
            return sock.sendMessage(from, { text: '🐙 *GitHub*\n\nUsage: .github <username>\nExample: .github torvalds' }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '🐙', key: message.key } });

        try {
            const [userRes, reposRes] = await Promise.all([
                axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`, { timeout: 10000 }),
                axios.get(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=5`, { timeout: 10000 })
            ]);

            const u = userRes.data;
            const repos = reposRes.data || [];

            const lines = [
                `🐙 *${u.login}*${u.name ? ` (${u.name})` : ''}`,
                u.bio ? `📝 ${u.bio}` : '',
                `📍 ${u.location || 'Unknown'}`,
                `📦 Public repos: ${u.public_repos}`,
                `👥 Followers: ${u.followers} | Following: ${u.following}`,
                `🔗 ${u.html_url}`,
                '',
                '📁 *Recent repos:*'
            ];

            repos.forEach(r => {
                lines.push(`• ${r.name} ${r.description ? `- ${r.description.slice(0, 60)}` : ''}${r.language ? ` [${r.language}]` : ''}`);
            });

            if (u.avatar_url) {
                await sock.sendMessage(from, {
                    image: { url: u.avatar_url },
                    caption: lines.filter(l => l).join('\n')
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, { text: lines.filter(l => l).join('\n') }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            if (error.response?.status === 404) {
                return sock.sendMessage(from, { text: `❌ GitHub user "${username}" not found.` }, { quoted: message });
            }
            return sock.sendMessage(from, { text: `❌ GitHub fetch failed: ${error.message}` }, { quoted: message });
        }
    }
};
