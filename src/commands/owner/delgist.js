import { extractGistId, getGitHubPat, ghFetch } from '../../utils/gistTools.js';

export default {
    name: 'delgist',
    category: 'owner',
    description: 'Delete a GitHub Gist by ID or URL',
    usage: 'delgist <gist id|url>',
    ownerOnly: true,

    async execute({ sock, message, from, args }) {
        const GH_PAT = getGitHubPat();
        if (!GH_PAT) return sock.sendMessage(from, { text: '❌ GitHub token not set in env.' }, { quoted: message });

        const raw = args.join(' ').trim();
        if (!raw) return sock.sendMessage(from, { text: '🗑️ Usage:\n.delgist <gist id|url>' }, { quoted: message });

        const gistId = extractGistId(raw);
        const res = await ghFetch(`/gists/${gistId}`, GH_PAT, { method: 'DELETE' });

        if (res.status === 204) return sock.sendMessage(from, { text: `✅ Gist deleted: ${gistId}` }, { quoted: message });
        if (res.status === 404) return sock.sendMessage(from, { text: '❌ Gist not found.' }, { quoted: message });
        if (res.status === 403) return sock.sendMessage(from, { text: '❌ Permission denied for this gist.' }, { quoted: message });
        return sock.sendMessage(from, { text: `❌ Unexpected error. Status: ${res.status}` }, { quoted: message });
    }
};
