import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

function chunkCode(content, lang = 'txt', max = 3500) {
    const out = [];
    for (let i = 0; i < content.length; i += max) {
        out.push(`\`\`\`${lang}\n${content.slice(i, i + max)}\n\`\`\``);
    }
    return out;
}

export default {
    name: 'openfile',
    aliases: ['open', 'readfile'],
    category: 'utility',
    description: 'Read and send content of replied file',
    usage: 'openfile (reply to document)',
    cooldown: 4,
    permissions: ['user'],
    args: false,

    async execute({ sock, message, from }) {
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.documentMessage) {
                return await sock.sendMessage(from, { text: '❌ Reply to a document file.' }, { quoted: message });
            }

            const fileName = quoted.documentMessage.fileName || 'file.txt';
            const ext = path.extname(fileName).toLowerCase();
            if (!['.txt', '.json', '.js', '.md', '.log', '.ts', '.env', '.yaml', '.yml'].includes(ext)) {
                return await sock.sendMessage(from, { text: '❌ Only text-like files are supported.' }, { quoted: message });
            }

            const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
            const content = buffer.toString('utf8');
            const lang = ext.replace('.', '') || 'txt';
            const parts = chunkCode(content, lang);

            await sock.sendMessage(from, { text: `📄 *${fileName}*\nLines: ${content.split('\n').length}\nParts: ${parts.length}` }, { quoted: message });
            for (const [idx, part] of parts.entries()) {
                await sock.sendMessage(from, { text: `Part ${idx + 1}/${parts.length}\n${part}` }, { quoted: message });
            }
        } catch {
            await sock.sendMessage(from, { text: '❌ Failed to read file (expired/too large).' }, { quoted: message });
        }
    }
};
