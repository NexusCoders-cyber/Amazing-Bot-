/**
 * setcmd.js — Bind any sticker to a bot command.
 * Usage:
 *   .setcmd <command>  (reply to a sticker) — bind sticker to command
 *   .setcmd list       — list all bindings
 *   .setcmd remove     (reply to a sticker) — remove binding
 *   .setcmd clear      — remove ALL bindings
 */

import { getUserStickerCmds, setUserStickerCmd, removeUserStickerCmd, clearUserStickerCmds } from '../../services/databaseService.js';

export function getStickerFingerprint(msg) {
    const sm = msg?.message?.stickerMessage || msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
    if (!sm) return null;
    if (sm.fileSha256) {
        return Buffer.isBuffer(sm.fileSha256) ? sm.fileSha256.toString('hex') : sm.fileSha256;
    }
    if (sm.fileEncSha256) {
        return Buffer.isBuffer(sm.fileEncSha256) ? sm.fileEncSha256.toString('hex') : sm.fileEncSha256;
    }
    if (sm.mediaKey) {
        return Buffer.isBuffer(sm.mediaKey) ? sm.mediaKey.toString('hex') : sm.mediaKey;
    }
    return null;
}

export default {
    name: 'setcmd',
    aliases: ['stikercmd'],
    category: 'owner',
    description: 'Bind a sticker to a bot command. Reply to sticker with .setcmd <command>',
    usage: 'setcmd <command> (reply to sticker) | setcmd list | setcmd remove | setcmd clear',
    cooldown: 3,
    ownerOnly: true,

    async execute({ sock, message, args, from, sender }) {
        const action = String(args[0] || '').toLowerCase();

        // Clear
        if (action === 'clear') {
            clearUserStickerCmds(sender);
            return sock.sendMessage(from, { text: '🗑️ All your sticker command bindings cleared.' }, { quoted: message });
        }

        // List
        if (action === 'list') {
            const bindings = getUserStickerCmds(sender);
            const entries = Object.entries(bindings);
            if (!entries.length) {
                return sock.sendMessage(from, { text: '📋 No sticker bindings. Reply to a sticker with .setcmd <command> to add one.' }, { quoted: message });
            }
            let txt = `📋 *Sticker Commands* (${entries.length})\n\n`;
            entries.forEach(([fp, cmd], i) => txt += `${i + 1}. .${cmd}\n   🔑 ${fp.slice(0, 12)}...\n\n`);
            return sock.sendMessage(from, { text: txt.trim() }, { quoted: message });
        }

        // Remove
        if (action === 'remove') {
            const fingerprint = getStickerFingerprint(message);
            if (!fingerprint) return sock.sendMessage(from, { text: '❌ Reply to a sticker.' }, { quoted: message });
            removeUserStickerCmd(sender, fingerprint);
            return sock.sendMessage(from, { text: '✅ Sticker binding removed.' }, { quoted: message });
        }

        // Set (default)
        const fingerprint = getStickerFingerprint(message);
        if (!fingerprint) {
            return sock.sendMessage(from, { text: '❌ Reply to a sticker with .setcmd <command>\n\n.setcmd help\n.setcmd list\n.setcmd remove\n.setcmd clear' }, { quoted: message });
        }

        const cmdName = action.replace(/^\./, '');
        if (!cmdName) {
            return sock.sendMessage(from, { text: '❌ Provide a command name.\nExample: .setcmd help (reply to sticker)' }, { quoted: message });
        }

        const bindings = getUserStickerCmds(sender);
        const existed = bindings[fingerprint];
        setUserStickerCmd(sender, fingerprint, cmdName);

        const replaced = existed && existed !== cmdName ? ` (replaced .${existed})` : '';
        await sock.sendMessage(from, { text: `✅ Sticker now triggers .${cmdName}${replaced}` }, { quoted: message });
    }
};
