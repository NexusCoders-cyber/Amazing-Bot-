import crypto from 'crypto';

function isBase64(value) {
    if (!value || typeof value !== 'string') return false;
    try {
        return Buffer.from(value, 'base64').toString('base64').replace(/=+$/, '') === value.replace(/=+$/, '');
    } catch {
        return false;
    }
}

export default {
    name: 'tools',
    aliases: ['tool', 'devtools'],
    category: 'utility',
    description: 'Developer tools: fetchhtml, encrypt, decrypt, endpoints and helpers',
    usage: 'tools <fetchhtml|encrypt|decrypt|endpoints|hash|base64|urlencode|urldecode> <text/url>',
    cooldown: 2,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const sub = (args[0] || '').toLowerCase();
        const input = args.slice(1).join(' ').trim();

        if (sub === 'endpoints') {
            return await sock.sendMessage(from, {
                text: '🧰 *Tools Endpoints*\n\n• tools fetchhtml <url>\n• tools encrypt <text>\n• tools decrypt <base64>\n• tools hash <text>\n• tools base64 <text>\n• tools urlencode <text>\n• tools urldecode <text>'
            }, { quoted: message });
        }

        if (!input) {
            return await sock.sendMessage(from, { text: '❌ Missing input text/url.' }, { quoted: message });
        }

        if (sub === 'fetchhtml') {
            const r = await fetch(input, { method: 'GET' });
            const html = await r.text();
            const preview = html.slice(0, 3000);
            return await sock.sendMessage(from, {
                text: `🌐 *Fetch HTML*\nStatus: ${r.status}\nLength: ${html.length}\n\n${preview}${html.length > preview.length ? '\n\n...truncated' : ''}`
            }, { quoted: message });
        }

        if (sub === 'encrypt') {
            const encoded = Buffer.from(input, 'utf8').toString('base64');
            return await sock.sendMessage(from, { text: `🔐 *Encrypted (base64):*\n${encoded}` }, { quoted: message });
        }

        if (sub === 'decrypt') {
            if (!isBase64(input)) {
                return await sock.sendMessage(from, { text: '❌ Input is not valid base64.' }, { quoted: message });
            }
            const decoded = Buffer.from(input, 'base64').toString('utf8');
            return await sock.sendMessage(from, { text: `🔓 *Decrypted:*\n${decoded}` }, { quoted: message });
        }

        if (sub === 'hash') {
            const sha256 = crypto.createHash('sha256').update(input).digest('hex');
            return await sock.sendMessage(from, { text: `#️⃣ *SHA-256*\n${sha256}` }, { quoted: message });
        }

        if (sub === 'base64') {
            const encoded = Buffer.from(input, 'utf8').toString('base64');
            return await sock.sendMessage(from, { text: `🧬 *Base64*\n${encoded}` }, { quoted: message });
        }

        if (sub === 'urlencode') {
            return await sock.sendMessage(from, { text: `🔗 *URL Encoded*\n${encodeURIComponent(input)}` }, { quoted: message });
        }

        if (sub === 'urldecode') {
            return await sock.sendMessage(from, { text: `🔗 *URL Decoded*\n${decodeURIComponent(input)}` }, { quoted: message });
        }

        return await sock.sendMessage(from, { text: '❌ Unknown tools action. Use: tools endpoints' }, { quoted: message });
    }
};
