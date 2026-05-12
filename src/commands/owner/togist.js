import { getGitHubPat, ghFetch, getLang, parseInput } from '../../utils/gistTools.js';

export default {
    name: 'togist',
    category: 'owner',
    description: 'Upload text or code to a secret GitHub Gist',
    usage: 'togist filename.js | code here',
    ownerOnly: true,
    args: false,

    async execute({ sock, message, from, args }) {
        const GH_PAT = getGitHubPat();
        if (!GH_PAT) {
            return sock.sendMessage(from, { text: '❌ GitHub token not set. Add GH_PAT or GITHUB_TOKEN in your .env.' }, { quoted: message });
        }

        const raw = args.join(' ').trim();
        if (!raw) {
            return sock.sendMessage(from, {
                text: [
                    '📤 *toGist — Usage*',
                    '• .togist filename.js | code here',
                    '• .togist // .py\\nprint("hello")',
                    '• Reply with text then use .togist',
                    '• No filename defaults to snippet.txt'
                ].join('\n')
            }, { quoted: message });
        }

        const { filename, content } = parseInput(raw);
        if (!content || !content.trim()) {
            return sock.sendMessage(from, { text: '❌ Content is empty. Put code after `|`.' }, { quoted: message });
        }

        await sock.sendMessage(from, { text: `📤 Uploading \`${filename}\` to Gist...` }, { quoted: message });

        const res = await ghFetch('/gists', GH_PAT, {
            method: 'POST',
            body: JSON.stringify({
                description: `${getLang(filename)} snippet`,
                public: false,
                files: { [filename]: { content } }
            })
        });
        const json = await res.json();

        if (!res.ok) {
            return sock.sendMessage(from, { text: `❌ GitHub API Error:\n\n\`${json.message || 'Unknown error'}\`` }, { quoted: message });
        }

        return sock.sendMessage(from, {
            text: [
                '✅ *Gist Created*',
                `📄 File: \`${filename}\``,
                `🗣️ Lang: ${getLang(filename)}`,
                `📏 Lines: ${content.split('\n').length}`,
                `🔤 Chars: ${content.length}`,
                `🆔 ID: \`${json.id}\``,
                `🔗 ${json.html_url}`
            ].join('\n')
        }, { quoted: message });
    }
};
