import { parseTime, setOpenTime, startGroupScheduler } from '../../services/groupScheduleService.js';

export default {
  name: 'opentime', category: 'admin', groupOnly: true, adminOnly: true,
  usage: 'opentime 7:30am', description: 'Set daily group open time', cooldown: 3,
  async execute({ sock, from, args, message }) {
    const t = parseTime(args.join(' '));
    if (!t) return sock.sendMessage(from, { text: '❌ Usage: opentime 7:30am' }, { quoted: message });
    setOpenTime(from, t); startGroupScheduler(sock);
    return sock.sendMessage(from, { text: `✅ Group open time set to ${t.label} daily.` }, { quoted: message });
  }
};
