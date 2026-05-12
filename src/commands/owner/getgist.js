import { extractGistId, getGitHubPat, getLang, ghFetch } from '../../utils/gistTools.js';

export default {
    name: 'getgist',
    category: 'owner',
    description: 'Fetch gist content by ID or URL',
    usage: 'getgist <id|url> [-file]',
    ownerOnly: true,

    async execute({ sock, message, from, args }) {
        const GH_PAT = getGitHubPat();
        if (!GH_PAT) return sock.sendMessage(from, { text: '❌ GitHub token not set in env.' }, { quoted: message });

        const rawInput = args.join(' ').trim();
        if (!rawInput) return sock.sendMessage(from, { text: '🔍 Usage:\n.getgist <id|url>\n.getgist <id|url> -file' }, { quoted: message });

        const sendAsFile = rawInput.includes('-file');
        const gistId = extractGistId(rawInput.replace('-file', '').trim());

        const res = await ghFetch(`/gists/${gistId}`, GH_PAT);
        const json = await res.json();
        if (!res.ok) return sock.sendMessage(from, { text: `❌ GitHub API Error: ${json.message || 'Unknown error'}` }, { quoted: message });

        const files = Object.values(json.files || {});
        if (!files.length) return sock.sendMessage(from, { text: '❌ Empty gist.' }, { quoted: message });

        if (sendAsFile) {
            for (const file of files) {
                const rawRes = await fetch(file.raw_url);
                if (!rawRes.ok) continue;
                const content = await rawRes.text();
                await sock.sendMessage(from, Buffer.from(content, 'utf8'), {
                    fileName: file.filename,
                    mimetype: 'application/octet-stream',
                    caption: `📄 ${file.filename} (${getLang(file.filename)})`
                }, 'document');
            }
            return;
        }

        if (files.length > 1) {
            const info = files.map((f, i) => `${i + 1}. ${f.filename} (${f.size} bytes)`).join('\n');
            return sock.sendMessage(from, { text: `📦 This gist has ${files.length} files:\n\n${info}\n\nUse -file to download all.` }, { quoted: message });
        }

        const file = files[0];
        const rawRes = await fetch(file.raw_url);
        if (!rawRes.ok) return sock.sendMessage(from, { text: `❌ Failed to fetch raw content (${rawRes.status}).` }, { quoted: message });

        const content = await rawRes.text();
        const maxContent = 3000;
        const display = content.length > maxContent
            ? `${content.slice(0, maxContent)}\n\n... truncated, use -file for full content`
            : content;

        return sock.sendMessage(from, { text: `🔍 ${file.filename} (${getLang(file.filename)})\n\n\`\`\`${display}\`\`\`` }, { quoted: message });
    }
};
