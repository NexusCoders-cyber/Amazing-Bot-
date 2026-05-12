import { extractGistId, getGitHubPat, getLang, ghFetch, parseEditInput } from '../../utils/gistTools.js';

export default {
    name: 'editgist',
    category: 'owner',
    description: 'Overwrite all files in a gist with new code',
    usage: 'editgist <gist id|url> [filename.ext] | new code',
    ownerOnly: true,

    async execute({ sock, message, from, args }) {
        const GH_PAT = getGitHubPat();
        if (!GH_PAT) return sock.sendMessage(from, { text: '❌ GitHub token not set in env.' }, { quoted: message });

        const raw = args.join(' ').trim();
        if (!raw) return sock.sendMessage(from, { text: '✏️ Usage:\n.editgist <gist id|url> [filename.ext] | new code' }, { quoted: message });

        const parsed = parseEditInput(raw);
        if (!parsed) return sock.sendMessage(from, { text: '❌ Invalid format. Use: .editgist <gist id|url> [filename.ext] | new code' }, { quoted: message });

        const gistId = extractGistId(parsed.gistRaw);
        if (!gistId) return sock.sendMessage(from, { text: '❌ Invalid gist ID/URL.' }, { quoted: message });

        const getRes = await ghFetch(`/gists/${gistId}`, GH_PAT);
        const gist = await getRes.json();
        if (!getRes.ok) return sock.sendMessage(from, { text: `❌ GitHub API Error: ${gist.message || 'Failed to fetch gist'}` }, { quoted: message });

        const existingFiles = Object.keys(gist.files || {});
        if (!existingFiles.length) return sock.sendMessage(from, { text: '❌ Gist has no files.' }, { quoted: message });

        const targetFilename = parsed.filename || existingFiles[0];
        const filesPatch = {};
        for (const oldName of existingFiles) filesPatch[oldName] = null;
        filesPatch[targetFilename] = { content: parsed.content };

        const patchRes = await ghFetch(`/gists/${gistId}`, GH_PAT, {
            method: 'PATCH',
            body: JSON.stringify({
                description: gist.description || `${getLang(targetFilename)} snippet`,
                files: filesPatch
            })
        });
        const updated = await patchRes.json();
        if (!patchRes.ok) return sock.sendMessage(from, { text: `❌ GitHub API Error: ${updated.message || 'Failed to edit gist'}` }, { quoted: message });

        return sock.sendMessage(from, {
            text: `✅ Gist updated\n🆔 ${updated.id}\n📄 ${targetFilename}\n🗣️ ${getLang(targetFilename)}\n🔗 ${updated.html_url}`
        }, { quoted: message });
    }
};
