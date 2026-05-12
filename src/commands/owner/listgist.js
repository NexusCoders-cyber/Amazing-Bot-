import { getGitHubPat, ghFetch } from '../../utils/gistTools.js';

export default {
    name: 'listgist',
    category: 'owner',
    description: 'List all your GitHub gists',
    usage: 'listgist [page]',
    ownerOnly: true,

    async execute({ sock, message, from, args }) {
        const GH_PAT = getGitHubPat();
        if (!GH_PAT) return sock.sendMessage(from, { text: '❌ GitHub token not set in env.' }, { quoted: message });

        const pageRaw = Number.parseInt((args[0] || '').trim(), 10);
        const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
        const res = await ghFetch(`/gists?per_page=10&page=${page}`, GH_PAT);
        const json = await res.json();

        if (!res.ok) return sock.sendMessage(from, { text: `❌ GitHub API Error: ${json.message || 'Unknown error'}` }, { quoted: message });
        if (!json.length) return sock.sendMessage(from, { text: `📋 No gists found on page ${page}.` }, { quoted: message });

        let text = `📋 *Your Gists — Page ${page}*\n`;
        json.forEach((gist, i) => {
            const files = Object.keys(gist.files || {});
            const firstName = files[0] || 'unknown';
            const fileCount = files.length;
            text += `\n${(page - 1) * 10 + i + 1}. \`${firstName}\`${fileCount > 1 ? ` (+${fileCount - 1})` : ''}\n`;
            text += `🆔 ${gist.id}\n🔗 ${gist.html_url}\n`;
        });
        text += `\n💡 Next page: .listgist ${page + 1}`;

        return sock.sendMessage(from, { text }, { quoted: message });
    }
};
