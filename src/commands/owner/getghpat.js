import { getGitHubPat, maskToken } from '../../utils/gistTools.js';

export default {
    name: 'getghpat',
    category: 'owner',
    description: 'Check GitHub token status for gist commands',
    usage: 'getghpat',
    ownerOnly: true,

    async execute({ sock, message, from }) {
        const token = getGitHubPat();
        if (!token) {
            return sock.sendMessage(from, { text: '🔑 GitHub token status: Not set.\nUse .setghpat <token> or set GH_PAT/GITHUB_TOKEN in env.' }, { quoted: message });
        }

        return sock.sendMessage(from, {
            text: `🔑 GitHub token status: Set\nToken: ${maskToken(token)}\nSource: ${process.env.GH_PAT ? 'GH_PAT' : 'GITHUB_TOKEN/GITHUB_PAT/GH_TOKEN'}`
        }, { quoted: message });
    }
};
