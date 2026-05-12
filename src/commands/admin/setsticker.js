import { setStickerAction, listStickerActions, deleteStickerAction, getStickerHashFromMessage } from '../../utils/stickerVault.js';

export default {
  name: 'setsticker',
  aliases: ['liststicker', 'delsticker'],
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Bind sticker to multi functions: tagall/suspend',
  usage: 'reply sticker: setsticker tagall | setsticker suspend @user | liststicker | delsticker <hash>',
  async execute({ sock, from, message, command, args }) {
    const cmd = String(command || '').toLowerCase();
    if (cmd === 'liststicker') {
      const rows = await listStickerActions(from);
      if (!rows.length) return sock.sendMessage(from, { text: 'No sticker actions set.' }, { quoted: message });
      return sock.sendMessage(from, { text: rows.map((r, i) => `${i+1}. ${r.hash.slice(0,12)}... | tagall:${r.tagEveryone?'on':'off'} | suspend:${r.suspendedUser||'none'}`).join('\n') }, { quoted: message });
    }
    if (cmd === 'delsticker') {
      const hash = String(args[0]||'').trim();
      if (!hash) return sock.sendMessage(from, { text: 'Provide hash from liststicker.' }, { quoted: message });
      await deleteStickerAction(from, hash);
      return sock.sendMessage(from, { text: '✅ Sticker action deleted.' }, { quoted: message });
    }

    const hash = await getStickerHashFromMessage(sock, message);
    if (!hash) return sock.sendMessage(from, { text: 'Reply to a sticker with setsticker command.' }, { quoted: message });
    const action = { tagEveryone: false, suspendedUser: null };
    const sub = String(args[0] || '').toLowerCase();
    if (sub === 'tagall') action.tagEveryone = true;
    else if (sub === 'suspend') {
      const m = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
      action.suspendedUser = replied || m[0] || null;
      if (!action.suspendedUser) return sock.sendMessage(from, { text: 'Mention/reply target user for suspend action.' }, { quoted: message });
    } else if (sub === 'both') {
      const m = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
      action.tagEveryone = true;
      action.suspendedUser = replied || m[0] || null;
    } else {
      return sock.sendMessage(from, { text: 'Use: setsticker tagall | setsticker suspend @user | setsticker both @user' }, { quoted: message });
    }
    await setStickerAction(from, hash, action);
    return sock.sendMessage(from, { text: `✅ Sticker action saved\nHash: ${hash}` }, { quoted: message });
  }
};
