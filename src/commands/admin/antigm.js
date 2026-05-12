const store = global.antiGmStore || (global.antiGmStore = new Map());

export function isAntiGmEnabled(chatId) {
  const row = store.get(chatId);
  if (!row) return false;
  if (row.expiresAt && Date.now() > row.expiresAt) { store.delete(chatId); return false; }
  return row.enabled === true;
}

function parseDuration(input = '') {
  const m = String(input).trim().match(/^(\d+)([smhd])$/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult = u === 's' ? 1000 : u === 'm' ? 60000 : u === 'h' ? 3600000 : 86400000;
  return n * mult;
}

export default {
  name: 'antigm', aliases: ['antistatusmention', 'antigroupmention'], category: 'admin',
  description: 'Delete messages that mention status/newsletter tags in group',
  usage: 'antigroupmention on|off|<1h>', groupOnly: true, adminOnly: true, botAdminRequired: true, cooldown: 2,
  async execute({ sock, message, from, args }) {
    const action = String(args[0] || '').toLowerCase();
    if (action === 'on') {
      store.set(from, { enabled: true, expiresAt: 0 });
      return sock.sendMessage(from, { text: '🛡️ *Antigroupmention Status:* ✅ ON' }, { quoted: message });
    }
    if (action === 'off') {
      store.delete(from);
      return sock.sendMessage(from, { text: '🛡️ *Antigroupmention Status:* ❌ OFF' }, { quoted: message });
    }
    const dur = parseDuration(action);
    if (dur > 0) {
      store.set(from, { enabled: true, expiresAt: Date.now() + dur });
      return sock.sendMessage(from, { text: `🛡️ *Antigroupmention Status:* ✅ ON\n⏱️ Timer: ${action}` }, { quoted: message });
    }
    return sock.sendMessage(from, { text: 'Usage:\n.antigroupmention on\n.antigroupmention off\n.antigroupmention 1h (set timer)' }, { quoted: message });
  }
};
