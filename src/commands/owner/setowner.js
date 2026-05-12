import { isMainOwner, addOwner, delOwner, getOwners } from '../../utils/owner.js';

export default {
  name: 'setowner',
  aliases: ['afdowner', 'addowner', 'delowner', 'listowner'],
  category: 'owner',
  description: 'Manage persistent owners',
  usage: 'setowner <number> | delowner <number> | listowner',
  ownerOnly: true,
  async execute({ sock, message, from, args, sender, command }) {
    const cmd = String(command || '').toLowerCase();
    if (cmd === 'listowner') {
      const owners = getOwners().map((o) => o.replace('@s.whatsapp.net', ''));
      return sock.sendMessage(from, { text: `Owners:\n${owners.join('\n') || 'None'}` }, { quoted: message });
    }

    if (cmd === 'delowner') {
      if (!isMainOwner(sender)) return sock.sendMessage(from, { text: 'Only main dev can remove owners.' }, { quoted: message });
      const result = delOwner(args[0] || '');
      return sock.sendMessage(from, { text: result.msg }, { quoted: message });
    }

    if (!isMainOwner(sender)) return sock.sendMessage(from, { text: 'Only the main dev can add owners.' }, { quoted: message });
    const number = (cmd === 'afdowner' && args[0] === 'owner') ? args[1] : args[0];
    if (!number) return sock.sendMessage(from, { text: 'Usage: setowner 2348012345678' }, { quoted: message });
    const result = addOwner(number);
    return sock.sendMessage(from, { text: result.msg }, { quoted: message });
  }
};
