import axios from 'axios';

const API_BASE = process.env.MALVRYX_API_BASE || 'https://arychauhann.onrender.com';

export default {
    name: 'igstalk',
    aliases: ['instastalk', 'iginfo'],
    category: 'utility',
    description: 'Fetch Instagram stats',
    usage: 'igstalk <username>',
    minArgs: 1,
    cooldown: 8,

    async execute({ sock, message, from, args }) {
        const query = args.join(' ').trim().replace(/^@/, '');
        if (!query) return sock.sendMessage(from, { text: '❌ Usage: igstalk <username>' }, { quoted: message });

        try {
            const url = `${API_BASE.replace(/\/$/, '')}/api/instastalk`;
            const { data } = await axios.get(url, { params: { query }, timeout: 120000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            const r = data?.result || data?.data || data;
            if (!r || data?.status === false) throw new Error(data?.message || 'No profile found');

            const lines = [
                '📸 *Instagram Stalk*',
                `👤 Username: ${r.username || `@${query}`}`,
                `🪪 Name: ${r.fullName || 'N/A'}`,
                `👥 Followers: ${r.followers || 'N/A'}`,
                `🖼️ Uploads: ${r.uploads || 'N/A'}`,
                `📈 Engagement: ${r.engagement || 'N/A'}`,
                `✅ Verified: ${String(r.isVerified) === 'true' ? 'Yes' : 'No'}`,
                '',
                `📝 Bio:\n${r.bio || 'N/A'}`
            ];

            if (r.profileImage) {
                return sock.sendMessage(from, {
                    image: { url: r.profileImage },
                    caption: lines.join('\n')
                }, { quoted: message });
            }

            return sock.sendMessage(from, { text: lines.join('\n') }, { quoted: message });
        } catch (error) {
            return sock.sendMessage(from, { text: `❌ igstalk failed: ${error.message}` }, { quoted: message });
        }
    }
};
