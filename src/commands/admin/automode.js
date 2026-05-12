import { getAutomationConfig } from '../../utils/automationStore.js';

export default {
  name: 'automode',
  aliases: ['autoread', 'autoreact', 'autostatusview', 'autolikestatus'],
  category: 'admin',
  description: 'Toggle automation features on/off',
  usage: 'autoread on|off | autoreact on|off | autostatusview on|off | autolikestatus on|off',
  ownerOnly: true,
  async execute({ sock, from, message, command, args }) {
    const cfg = getAutomationConfig();
    const cmd = String(command || '').toLowerCase();
    const on = /^(on|1|true)$/i.test(args[0] || '');
    const off = /^(off|0|false)$/i.test(args[0] || '');
    if (!on && !off) {
      return sock.sendMessage(from, { text: 'Use on/off. Example: autoread on' }, { quoted: message });
    }
    const value = on;
    if (cmd === 'autoread') cfg.autoRead = value;
    else if (cmd === 'autoreact') cfg.autoReact = value;
    else if (cmd === 'autostatusview') cfg.autoStatusView = value;
    else if (cmd === 'autolikestatus') cfg.autoLikeStatus = value;
    else return;
    return sock.sendMessage(from, { text: `✅ ${cmd} ${value ? 'ON' : 'OFF'}` }, { quoted: message });
  }
};
