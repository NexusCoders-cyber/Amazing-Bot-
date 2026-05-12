import { upsertEnvVar } from '../../utils/gistTools.js';

export default {
    name: 'setghpat',
    category: 'owner',
    description: 'Set GH_PAT in .env for gist commands',
    usage: 'setghpat <token>',
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const token = args.join(' ').trim();
        if (!token) {
            return sock.sendMessage(from, { text: '🔑 Usage: .setghpat <github_token>' }, { quoted: message });
        }

        upsertEnvVar('GH_PAT', token);
        if (!process.env.GITHUB_TOKEN) process.env.GITHUB_TOKEN = token;

        return sock.sendMessage(from, {
            text: '✅ GitHub token saved to .env as GH_PAT. Gist commands will use it now.'
        }, { quoted: message });
    }
};
