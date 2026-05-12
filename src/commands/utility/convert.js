function getQuotedText(message) {
    const q = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!q) return '';
    return q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || '';
}

function indentBlock(code, spaces) {
    const pad = ' '.repeat(spaces);
    return code.split('\n').map((line) => `${pad}${line}`).join('\n');
}

function extractMeta(code) {
    const name = (code.match(/name:\s*['"`]([^'"`]+)['"`]/)?.[1] || code.match(/case\s+['"`]([^'"`]+)['"`]/)?.[1] || 'newcmd').trim();
    const description = (code.match(/description:\s*['"`]([^'"`]+)['"`]/)?.[1] || 'Converted command').trim();
    const aliasesMatch = code.match(/aliases:\s*\[([^\]]*)\]/);
    const aliases = aliasesMatch?.[1]
        ? aliasesMatch[1].split(',').map((v) => v.trim().replace(/^['"`]|['"`]$/g, '')).filter(Boolean)
        : [];
    const convertedName = name.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'newcmd';
    return { convertedName, description, aliases };
}

function toCaseTemplate(code, meta) {
    const aliasText = meta.aliases.length ? meta.aliases.join(', ') : 'none';
    return `// Converted Name: ${meta.convertedName}\n// Description: ${meta.description}\n// Aliases: ${aliasText}\nswitch (command) {\n  case '${meta.convertedName}': {\n${indentBlock(code, 4)}\n    break;\n  }\n}`;
}

function toMineTemplate(code, meta) {
    const aliases = meta.aliases.map((a) => `'${a}'`).join(', ');
    return `export default {\n  name: '${meta.convertedName}',\n  aliases: [${aliases}],\n  category: 'utility',\n  description: '${meta.description.replace(/'/g, "\\'")}',\n  usage: '${meta.convertedName} <args>',\n  cooldown: 3,\n  async execute({ sock, message, args, from }) {\n${indentBlock(code, 4)}\n  }\n};`;
}

function toPluginsTemplate(code, meta) {
    const commands = [`'${meta.convertedName}'`, ...meta.aliases.map((a) => `'${a}'`)].join(', ');
    return `let handler = async (m, { args, usedPrefix, command }) => {\n${indentBlock(code, 2)}\n}\n\nhandler.help = ['${meta.convertedName}']\nhandler.tags = ['tools']\nhandler.command = [${commands}]\nhandler.desc = '${meta.description.replace(/'/g, "\\'")}'\n\nexport default handler`;
}

export default {
    name: 'convert',
    aliases: ['cvt'],
    category: 'utility',
    description: 'Convert replied command code to case/mine/plugins structure',
    usage: 'convert <case|mine|plugins> (reply to code)',
    cooldown: 3,
    minArgs: 1,

    async execute({ sock, message, args, from, prefix }) {
        const mode = (args[0] || '').toLowerCase();
        const source = getQuotedText(message);

        if (!source) {
            return sock.sendMessage(from, { text: `❌ Reply to a command/code message first.\nUsage: ${prefix}convert <case|mine|plugins>` }, { quoted: message });
        }

        const meta = extractMeta(source);
        let output;
        if (mode === 'case') output = toCaseTemplate(source, meta);
        else if (mode === 'mine') output = toMineTemplate(source, meta);
        else if (mode === 'plugins') output = toPluginsTemplate(source, meta);
        else {
            return sock.sendMessage(from, { text: `❌ Unknown mode: ${mode}\nUse: case, mine, or plugins.` }, { quoted: message });
        }

        await sock.sendMessage(from, {
            text: `✅ Converted to *${mode}* style:\n\n\`\`\`javascript\n${output}\n\`\`\``
        }, { quoted: message });
    }
};
