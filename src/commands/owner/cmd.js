import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { commandManager } from '../../utils/commandManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORIES = ['admin', 'ai', 'downloader', 'economy', 'fun', 'games', 'general', 'media', 'owner', 'utility'];

function fmtSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
}

function buildStatusBar(label, value) {
    return `  ${label.padEnd(14)} ${value}`;
}

function successBox(title, lines) {
    return [`✅  ${title}`, '', ...lines.map(l => `  ${l}`)].join('\n');
}

function errorBox(title, detail = '') {
    return [`❌  ${title}`, detail ? `\n  ${detail}` : ''].join('');
}

function getRealSock() {
    return global.sock;
}

async function waitForReaction(from, messageId, emoji, timeoutMs = 60000) {
    return new Promise((resolve) => {
        const rawSock = getRealSock();
        if (!rawSock) return resolve(false);

        let settled = false;

        const cleanup = () => {
            try { rawSock.ev.removeListener('messages.upsert', onUpsert); } catch {}
            try { rawSock.ev.removeListener('messages.reaction', onReaction); } catch {}
        };

        const timer = setTimeout(() => {
            if (!settled) { settled = true; cleanup(); resolve(false); }
        }, timeoutMs);

        const checkReaction = (remoteJid, reactionKey, reactionText) => {
            if (settled) return;
            if (remoteJid !== from) return;
            if (reactionKey?.id !== messageId) return;
            if (reactionText !== emoji) return;
            settled = true;
            clearTimeout(timer);
            cleanup();
            resolve(true);
        };

        const onUpsert = ({ messages }) => {
            if (!messages?.length) return;
            for (const m of messages) {
                const r = m.message?.reactionMessage;
                if (!r) continue;
                checkReaction(m.key.remoteJid, r.key, r.text);
            }
        };

        const onReaction = (reactions) => {
            if (!Array.isArray(reactions)) reactions = [reactions];
            for (const r of reactions) {
                checkReaction(r.key?.remoteJid, r.key, r.text);
            }
        };

        rawSock.ev.on('messages.upsert', onUpsert);
        rawSock.ev.on('messages.reaction', onReaction);
    });
}

async function installFile(sock, from, message, content, fileName, targetCategory, commandsDir, replace = false) {
    const targetPath = path.join(commandsDir, targetCategory, fileName);
    fs.writeFileSync(targetPath, content);

    const fileSize = fmtSize(Buffer.byteLength(content, 'utf8'));
    const lines = content.split('\n').length;

    let reloadInfo = `⚡  Use: cmd reload ${fileName.replace('.js', '')}`;

    try {
        const loaded = await commandManager.loadCommand(targetCategory, fileName);
        if (loaded) {
            const cmdName = fileName.replace('.js', '');
            reloadInfo = `⚡  Active instantly as: ${cmdName}`;
        }
    } catch {}

    const verb = replace ? 'REPLACED & LOADED' : 'INSTALLED & LOADED';
    await sock.sendMessage(from, {
        text: successBox(verb, [
            buildStatusBar('File:', fileName),
            buildStatusBar('Category:', targetCategory),
            buildStatusBar('Path:', `${targetCategory}/${fileName}`),
            buildStatusBar('Size:', fileSize),
            buildStatusBar('Lines:', String(lines)),
            '',
            reloadInfo
        ])
    }, { quoted: message });
}

export default {
    name: 'cmd',
    aliases: ['command', 'plugin'],
    category: 'owner',
    description: 'Advanced command management — install, upload, reload, delete, search, inspect',
    usage: 'cmd <action> [options]',
    example: 'cmd list\ncmd list fun\ncmd find ping\ncmd get general/ping.js\ncmd install https://url.com/cmd.js general\ncmd upload general\ncmd reload ping\ncmd reload all\ncmd reload category admin\ncmd delete general/test.js\ncmd info ping\ncmd enable ping\ncmd disable ping\ncmd stats',
    cooldown: 2,
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, isGroup, prefix }) {
        const action = args[0].toLowerCase();
        const commandsDir = path.join(process.cwd(), 'src', 'commands');

        try {
            switch (action) {

                case 'list':
                case 'ls': {
                    const cat = args[1]?.toLowerCase();

                    if (cat && CATEGORIES.includes(cat)) {
                        const catPath = path.join(commandsDir, cat);
                        if (!fs.existsSync(catPath)) {
                            return await sock.sendMessage(from, { text: errorBox('Category folder not found', cat) }, { quoted: message });
                        }
                        const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
                        const rows = files.map(f => {
                            const name = f.replace('.js', '');
                            const loaded = !!commandManager.getCommand(name);
                            return `${loaded ? '🟢' : '⚪'}  ${name}`;
                        });
                        return await sock.sendMessage(from, {
                            text: `📂  ${cat.toUpperCase()}  —  ${files.length} files\n\n${rows.join('\n')}\n\n🟢 loaded  ⚪ not loaded`
                        }, { quoted: message });
                    }

                    let total = 0;
                    let text = `📋  COMMAND LIST\n${'─'.repeat(30)}\n\n`;
                    for (const c of CATEGORIES) {
                        const p = path.join(commandsDir, c);
                        if (!fs.existsSync(p)) continue;
                        const files = fs.readdirSync(p).filter(f => f.endsWith('.js'));
                        const loadedCount = files.filter(f => commandManager.getCommand(f.replace('.js', ''))).length;
                        total += files.length;
                        text += `📁  ${c.padEnd(12)} ${files.length} files  (${loadedCount} active)\n`;
                    }
                    const stats = commandManager.getSystemStats();
                    text += `\n${'─'.repeat(30)}\n`;
                    text += `📊  Total: ${total} files  |  ${stats.enabledCommands} active\n`;
                    text += `💡  ${prefix}cmd list <category> for details`;
                    await sock.sendMessage(from, { text }, { quoted: message });
                    break;
                }

                case 'find':
                case 'search': {
                    const query = args[1];
                    if (!query) {
                        return await sock.sendMessage(from, { text: errorBox('Query required', `Usage: ${prefix}cmd find <name>`) }, { quoted: message });
                    }

                    const fileResults = [];
                    for (const c of CATEGORIES) {
                        const p = path.join(commandsDir, c);
                        if (!fs.existsSync(p)) continue;
                        const files = fs.readdirSync(p).filter(f => f.endsWith('.js') && f.toLowerCase().includes(query.toLowerCase()));
                        for (const f of files) {
                            const name = f.replace('.js', '');
                            fileResults.push({ name, category: c, file: f, loaded: !!commandManager.getCommand(name) });
                        }
                    }

                    const liveMatches = commandManager.searchCommands(query);
                    for (const c of liveMatches) {
                        if (!fileResults.find(r => r.name === c.name)) {
                            fileResults.push({ name: c.name, category: c.category, file: c.filename, loaded: true });
                        }
                    }

                    if (!fileResults.length) {
                        return await sock.sendMessage(from, { text: `🔍  No results for "${query}"` }, { quoted: message });
                    }

                    let text = `🔍  "${query}"  —  ${fileResults.length} found\n\n`;
                    for (const r of fileResults) {
                        text += `${r.loaded ? '🟢' : '⚪'}  ${r.name}\n    📁 ${r.category}/${r.file}\n\n`;
                    }
                    await sock.sendMessage(from, { text: text.trim() }, { quoted: message });
                    break;
                }

                case 'get':
                case 'download':
                case 'view': {
                    const cmdPath = args[1]?.replace(/\\/g, '/');
                    if (!cmdPath) {
                        return await sock.sendMessage(from, { text: errorBox('Path required', `Usage: ${prefix}cmd get <category/file.js>`) }, { quoted: message });
                    }
                    const fullPath = path.join(commandsDir, cmdPath);
                    if (!fs.existsSync(fullPath)) {
                        return await sock.sendMessage(from, { text: errorBox('File not found', cmdPath) }, { quoted: message });
                    }
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const fileName = path.basename(cmdPath);
                    await sock.sendMessage(from, {
                        document: Buffer.from(content, 'utf8'),
                        mimetype: 'text/javascript',
                        fileName,
                        caption: `📄  ${fileName}\n📂  ${cmdPath}\n💾  ${fmtSize(Buffer.byteLength(content, 'utf8'))}\n📝  ${content.split('\n').length} lines`
                    }, { quoted: message });
                    break;
                }

                case 'install':
                case 'add': {
                    const source = args[1];
                    if (!source) {
                        return await sock.sendMessage(from, { text: errorBox('URL required', `Usage: ${prefix}cmd install <url> [category]`) }, { quoted: message });
                    }
                    const targetCategory = args[2]?.toLowerCase() || 'general';
                    if (!CATEGORIES.includes(targetCategory)) {
                        return await sock.sendMessage(from, { text: errorBox('Invalid category', CATEGORIES.join(', ')) }, { quoted: message });
                    }

                    let content, fileName;

                    if (source.startsWith('http://') || source.startsWith('https://')) {
                        await sock.sendMessage(from, { text: `⏳  Downloading...` }, { quoted: message });
                        try {
                            const res = await axios.get(source, { timeout: 15000 });
                            content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
                            fileName = path.basename(new URL(source).pathname);
                            if (!fileName.endsWith('.js')) fileName += '.js';
                        } catch (e) {
                            return await sock.sendMessage(from, { text: errorBox('Download failed', e.message) }, { quoted: message });
                        }
                    } else {
                        if (!fs.existsSync(source)) {
                            return await sock.sendMessage(from, { text: errorBox('File not found', source) }, { quoted: message });
                        }
                        content = fs.readFileSync(source, 'utf8');
                        fileName = path.basename(source);
                    }

                    if (!fileName.endsWith('.js')) {
                        return await sock.sendMessage(from, { text: errorBox('Invalid file type', 'Only .js files are supported') }, { quoted: message });
                    }

                    const targetPath = path.join(commandsDir, targetCategory, fileName);

                    if (fs.existsSync(targetPath)) {
                        const warn = await sock.sendMessage(from, {
                            text: `⚠️  *${fileName}* already exists in ${targetCategory}\n\nReact ❤️ to this message within 60s to replace it.`
                        }, { quoted: message });
                        const confirmed = await waitForReaction(from, warn.key.id, '❤️');
                        if (!confirmed) {
                            return await sock.sendMessage(from, { text: `⏱️  Timed out. File was NOT replaced.` }, { quoted: warn });
                        }
                        await installFile(sock, from, message, content, fileName, targetCategory, commandsDir, true);
                    } else {
                        await installFile(sock, from, message, content, fileName, targetCategory, commandsDir, false);
                    }
                    break;
                }

                case 'upload':
                case 'attach': {
                    const targetCategory = args[1]?.toLowerCase() || 'general';
                    if (!CATEGORIES.includes(targetCategory)) {
                        return await sock.sendMessage(from, { text: errorBox('Invalid category', CATEGORIES.join(', ')) }, { quoted: message });
                    }

                    const ctx = message.message?.extendedTextMessage?.contextInfo;
                    const quotedMsg = ctx?.quotedMessage;
                    const docMsg = quotedMsg?.documentMessage;

                    if (!docMsg) {
                        return await sock.sendMessage(from, {
                            text: `💡  UPLOAD GUIDE\n\n1. Send your .js file as a document\n2. Reply to it with:\n   ${prefix}cmd upload [category]\n\nCategories: ${CATEGORIES.join(', ')}`
                        }, { quoted: message });
                    }

                    const fileName = docMsg.fileName || 'command.js';
                    if (!fileName.endsWith('.js')) {
                        return await sock.sendMessage(from, { text: errorBox('Invalid file type', 'Only .js files allowed') }, { quoted: message });
                    }

                    const stanzaId = ctx?.stanzaId;
                    if (!stanzaId) {
                        return await sock.sendMessage(from, { text: errorBox('Cannot read quoted message ID') }, { quoted: message });
                    }

                    const quotedKey = {
                        remoteJid: from,
                        id: stanzaId,
                        fromMe: false,
                        ...(isGroup && { participant: sender })
                    };

                    await sock.sendMessage(from, { text: `⏳  Reading file...` }, { quoted: message });

                    let buffer;
                    try {
                        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
                        buffer = await downloadMediaMessage({ message: quotedMsg, key: quotedKey }, 'buffer', {});
                    } catch (e) {
                        return await sock.sendMessage(from, { text: errorBox('Download failed', e.message) }, { quoted: message });
                    }

                    const content = buffer.toString('utf8');
                    const targetPath = path.join(commandsDir, targetCategory, fileName);

                    if (fs.existsSync(targetPath)) {
                        const warn = await sock.sendMessage(from, {
                            text: `⚠️  *${fileName}* already exists in ${targetCategory}\n\nReact ❤️ to this message within 60s to replace it.`
                        }, { quoted: message });
                        const confirmed = await waitForReaction(from, warn.key.id, '❤️');
                        if (!confirmed) {
                            return await sock.sendMessage(from, { text: `⏱️  Timed out. File was NOT replaced.` }, { quoted: warn });
                        }
                        await installFile(sock, from, message, content, fileName, targetCategory, commandsDir, true);
                    } else {
                        await installFile(sock, from, message, content, fileName, targetCategory, commandsDir, false);
                    }
                    break;
                }

                case 'reload':
                case 'refresh': {
                    const target = args[1]?.toLowerCase();
                    if (!target) {
                        return await sock.sendMessage(from, { text: errorBox('Target required', `${prefix}cmd reload <name|all|category <cat>>`) }, { quoted: message });
                    }

                    if (target === 'all') {
                        await sock.sendMessage(from, { text: `⏳  Reloading all commands...` }, { quoted: message });
                        const count = await commandManager.reloadAllCommands();
                        return await sock.sendMessage(from, {
                            text: successBox('ALL COMMANDS RELOADED', [
                                buildStatusBar('Loaded:', `${count} commands`),
                                buildStatusBar('Status:', 'All active ⚡')
                            ])
                        }, { quoted: message });
                    }

                    if (target === 'category') {
                        const cat = args[2]?.toLowerCase();
                        if (!cat || !CATEGORIES.includes(cat)) {
                            return await sock.sendMessage(from, { text: errorBox('Valid category required', CATEGORIES.join(', ')) }, { quoted: message });
                        }
                        await sock.sendMessage(from, { text: `⏳  Reloading ${cat}...` }, { quoted: message });
                        const count = await commandManager.reloadCategory(cat);
                        return await sock.sendMessage(from, {
                            text: successBox(`CATEGORY RELOADED: ${cat.toUpperCase()}`, [
                                buildStatusBar('Commands:', `${count} loaded`),
                                buildStatusBar('Status:', 'Active ⚡')
                            ])
                        }, { quoted: message });
                    }

                    const existing = commandManager.getCommand(target);
                    if (!existing) {
                        for (const c of CATEGORIES) {
                            const p = path.join(commandsDir, c, `${target}.js`);
                            if (fs.existsSync(p)) {
                                const ok = await commandManager.loadCommand(c, `${target}.js`);
                                if (ok) {
                                    return await sock.sendMessage(from, {
                                        text: successBox('COMMAND LOADED', [
                                            buildStatusBar('Name:', target),
                                            buildStatusBar('Category:', c),
                                            buildStatusBar('Status:', 'Active ⚡')
                                        ])
                                    }, { quoted: message });
                                }
                            }
                        }
                        return await sock.sendMessage(from, { text: errorBox('Command not found', target) }, { quoted: message });
                    }

                    const ok = await commandManager.reloadCommand(target);
                    if (!ok) {
                        return await sock.sendMessage(from, { text: errorBox('Reload failed', `Could not reload ${target}`) }, { quoted: message });
                    }

                    await sock.sendMessage(from, {
                        text: successBox('RELOADED', [
                            buildStatusBar('Command:', target),
                            buildStatusBar('Category:', existing.category),
                            buildStatusBar('Status:', 'Active ⚡')
                        ])
                    }, { quoted: message });
                    break;
                }

                case 'delete':
                case 'remove':
                case 'rm': {
                    const cmdPath = args[1]?.replace(/\\/g, '/');
                    if (!cmdPath) {
                        return await sock.sendMessage(from, { text: errorBox('Path required', `Usage: ${prefix}cmd delete <category/file.js>`) }, { quoted: message });
                    }
                    const fullPath = path.join(commandsDir, cmdPath);
                    if (!fs.existsSync(fullPath)) {
                        return await sock.sendMessage(from, { text: errorBox('File not found', cmdPath) }, { quoted: message });
                    }

                    const fileName = path.basename(cmdPath);
                    const warn = await sock.sendMessage(from, {
                        text: `⚠️  About to permanently delete:\n  ${fileName}\n\nReact ❤️ to this message within 60s to confirm.`
                    }, { quoted: message });

                    const confirmed = await waitForReaction(from, warn.key.id, '❤️');
                    if (!confirmed) {
                        return await sock.sendMessage(from, { text: `⏱️  Timed out. File was NOT deleted.` }, { quoted: warn });
                    }

                    const cmdName = fileName.replace('.js', '');
                    const loadedCmd = commandManager.getCommand(cmdName);
                    if (loadedCmd) {
                        commandManager.loadedCommands.delete(loadedCmd.name);
                        if (loadedCmd.aliases) loadedCmd.aliases.forEach(a => commandManager.aliases.delete(a));
                        const catCmds = commandManager.commandCategories.get(loadedCmd.category) || [];
                        const idx = catCmds.indexOf(loadedCmd.name);
                        if (idx > -1) catCmds.splice(idx, 1);
                    }

                    fs.unlinkSync(fullPath);

                    await sock.sendMessage(from, {
                        text: successBox('DELETED', [
                            buildStatusBar('File:', fileName),
                            buildStatusBar('Path:', cmdPath),
                            buildStatusBar('Memory:', loadedCmd ? 'Unloaded ⚡' : 'Was not loaded')
                        ])
                    }, { quoted: message });
                    break;
                }

                case 'info':
                case 'details': {
                    const target = args[1]?.toLowerCase();
                    if (!target) {
                        return await sock.sendMessage(from, { text: errorBox('Name required', `Usage: ${prefix}cmd info <name>`) }, { quoted: message });
                    }
                    const cmd = commandManager.getCommand(target);
                    if (!cmd) {
                        return await sock.sendMessage(from, { text: errorBox('Command not found', target) }, { quoted: message });
                    }

                    const usage = commandManager.commandUsage.get(cmd.name) || {};
                    const enabled = commandManager.isCommandEnabled(cmd.name);

                    let text = `ℹ️  ${cmd.name.toUpperCase()}\n${'─'.repeat(30)}\n\n`;
                    text += buildStatusBar('Name:', cmd.name) + '\n';
                    text += buildStatusBar('Aliases:', cmd.aliases?.join(', ') || 'none') + '\n';
                    text += buildStatusBar('Category:', cmd.category) + '\n';
                    text += buildStatusBar('File:', cmd.filename) + '\n';
                    text += buildStatusBar('Status:', enabled ? '🟢 enabled' : '🔴 disabled') + '\n';
                    text += buildStatusBar('Cooldown:', `${cmd.cooldown || 0}s`) + '\n';
                    text += buildStatusBar('Owner only:', cmd.ownerOnly ? 'yes' : 'no') + '\n';
                    text += buildStatusBar('Used:', `${usage.used || 0}x`) + '\n';
                    text += buildStatusBar('Errors:', `${usage.errors || 0}`) + '\n';
                    text += buildStatusBar('Avg time:', `${usage.avgExecutionTime || 0}ms`) + '\n';
                    if (cmd.description) text += `\n📖  ${cmd.description}\n`;
                    if (cmd.usage) text += `\n💡  ${prefix}${cmd.usage}\n`;
                    if (cmd.example) text += `\n📝  Examples:\n${cmd.example.split('\n').map(l => `   ${prefix}${l}`).join('\n')}\n`;

                    await sock.sendMessage(from, { text }, { quoted: message });
                    break;
                }

                case 'enable': {
                    const target = args[1]?.toLowerCase();
                    if (!target) return await sock.sendMessage(from, { text: errorBox('Name required') }, { quoted: message });
                    if (!commandManager.getCommand(target)) return await sock.sendMessage(from, { text: errorBox('Command not found', target) }, { quoted: message });
                    commandManager.enableCommand(target);
                    await sock.sendMessage(from, { text: `🟢  ${target} is now enabled` }, { quoted: message });
                    break;
                }

                case 'disable': {
                    const target = args[1]?.toLowerCase();
                    if (!target) return await sock.sendMessage(from, { text: errorBox('Name required') }, { quoted: message });
                    if (!commandManager.getCommand(target)) return await sock.sendMessage(from, { text: errorBox('Command not found', target) }, { quoted: message });
                    commandManager.disableCommand(target);
                    await sock.sendMessage(from, { text: `🔴  ${target} is now disabled` }, { quoted: message });
                    break;
                }

                case 'stats': {
                    const s = commandManager.getSystemStats();
                    const top = commandManager.getTopCommands(5);
                    let text = `📊  COMMAND STATS\n${'─'.repeat(30)}\n\n`;
                    text += buildStatusBar('Total:', s.totalCommands) + '\n';
                    text += buildStatusBar('Enabled:', s.enabledCommands) + '\n';
                    text += buildStatusBar('Disabled:', s.disabledCommands) + '\n';
                    text += buildStatusBar('Categories:', s.categories) + '\n';
                    text += buildStatusBar('Aliases:', s.totalAliases) + '\n';
                    text += buildStatusBar('Total usage:', s.totalUsage) + '\n';
                    text += buildStatusBar('Total errors:', s.totalErrors) + '\n';
                    if (top.length) {
                        text += `\n🏆  Top Commands:\n`;
                        top.forEach((c, i) => { text += `   ${i + 1}. ${c.name}  (${c.used}x)\n`; });
                    }
                    await sock.sendMessage(from, { text }, { quoted: message });
                    break;
                }

                default: {
                    await sock.sendMessage(from, {
                        text: `🛠️  CMD MANAGER\n${'─'.repeat(30)}\n\n` +
                            `${prefix}cmd list [cat]          list commands\n` +
                            `${prefix}cmd find <query>        search\n` +
                            `${prefix}cmd get <cat/file>      download file\n` +
                            `${prefix}cmd install <url> [cat] from URL\n` +
                            `${prefix}cmd upload [cat]        from reply\n` +
                            `${prefix}cmd reload <name>       hot reload\n` +
                            `${prefix}cmd reload all          reload everything\n` +
                            `${prefix}cmd reload category <c> reload category\n` +
                            `${prefix}cmd delete <cat/file>   delete file\n` +
                            `${prefix}cmd info <name>         command details\n` +
                            `${prefix}cmd enable/disable <n>  toggle command\n` +
                            `${prefix}cmd stats               usage stats`
                    }, { quoted: message });
                }
            }

        } catch (error) {
            await sock.sendMessage(from, {
                text: errorBox('System Error', error.message)
            }, { quoted: message });
        }
    }
};
