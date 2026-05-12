const cfg = global.autoStatusCfg || (global.autoStatusCfg = { view: false, like: false, emoji: '❤️' });

export function getAutoStatusConfig() { return cfg; }

export default {
  name: 'autostatus',
  aliases: ['autoviewstatus', 'autolikestatus'],
  category: 'admin',
  description: 'Auto view/like WhatsApp statuses',
  usage: 'autostatus view on|off | autostatus like on|off [emoji] | autostatus status',
  ownerOnly: true,
  async execute({ sock, message, from, args, command }) {
    const cmd = String(command || '').toLowerCase();
    if (cmd === 'autoviewstatus') {
      cfg.view = /on|1|true/i.test(args[0] || '');
      return sock.sendMessage(from, { text: `✅ Auto status view: ${cfg.view ? 'ON' : 'OFF'}` }, { quoted: message });
    }
    if (cmd === 'autolikestatus') {
      cfg.like = /on|1|true/i.test(args[0] || '');
      if (args[1]) cfg.emoji = args[1];
      return sock.sendMessage(from, { text: `✅ Auto status like: ${cfg.like ? 'ON' : 'OFF'}\nEmoji: ${cfg.emoji}` }, { quoted: message });
    }

    const sub = String(args[0] || 'status').toLowerCase();
    if (sub === 'status') return sock.sendMessage(from, { text: `👁️ AutoView: ${cfg.view ? 'ON' : 'OFF'}\n❤️ AutoLike: ${cfg.like ? 'ON' : 'OFF'} (${cfg.emoji})` }, { quoted: message });
    if (sub === 'view') cfg.view = /on|1|true/i.test(args[1] || '');
    else if (sub === 'like') { cfg.like = /on|1|true/i.test(args[1] || ''); if (args[2]) cfg.emoji = args[2]; }
    else return sock.sendMessage(from, { text: 'Usage: autostatus view on|off | autostatus like on|off [emoji] | autostatus status' }, { quoted: message });

    return sock.sendMessage(from, { text: `✅ Updated\n👁️ AutoView: ${cfg.view ? 'ON' : 'OFF'}\n❤️ AutoLike: ${cfg.like ? 'ON' : 'OFF'} (${cfg.emoji})` }, { quoted: message });
  }
};
