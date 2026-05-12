import axios from 'axios';

function normalizeUsername(raw) {
    return String(raw || '').trim().replace(/^@/, '').toLowerCase();
}

export default {
    name: 'ngl',
    aliases: [],
    category: 'utility',
    description: 'Send one NGL message (anti-spam guarded)',
    usage: 'ngl <username> | <message>',
    example: 'ngl johndoe | hello there',
    cooldown: 20,
    permissions: ['owner'],
    ownerOnly: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const joined = args.join(' ').trim();
        const parts = joined.split('|').map(s => s.trim()).filter(Boolean);

        if (parts.length < 2) {
            await sock.sendMessage(from, {
                text: '❌ Usage: ngl <username> | <message>\nExample: ngl johndoe | hello there'
            }, { quoted: message });
            return;
        }

        const username = normalizeUsername(parts[0]);
        const question = parts.slice(1).join(' | ').trim();

        if (!username || !question) {
            await sock.sendMessage(from, {
                text: '❌ Invalid username or message.'
            }, { quoted: message });
            return;
        }

        if (question.length > 300) {
            await sock.sendMessage(from, {
                text: '❌ Message too long (max 300 characters).'
            }, { quoted: message });
            return;
        }

        try {
            const response = await axios.post('https://ngl.link/api/submit', {
                username,
                question,
                deviceId: 'a9f9e581-9ef3-4af2-95f0-7e8d2f7f2f53',
                gameSlug: '',
                referrer: ''
            }, {
                timeout: 20000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (response.status >= 200 && response.status < 300) {
                await sock.sendMessage(from, {
                    text: `✅ Sent 1 message to NGL user: ${username}`
                }, { quoted: message });
            } else {
                await sock.sendMessage(from, {
                    text: `❌ NGL request failed with status: ${response.status}`
                }, { quoted: message });
            }
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ NGL error: ${error.message}`
            }, { quoted: message });
        }
    }
};
