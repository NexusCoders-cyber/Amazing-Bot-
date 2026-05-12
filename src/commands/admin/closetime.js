import { parseTime, setCloseTime, startGroupScheduler } from '../../services/groupScheduleService.js';

export default {
  name: 'closetime', category: 'admin', groupOnly: true, adminOnly: true,
  usage: 'closetime 8:30pm', description: 'Set daily group close time', cooldown: 3,
  async execute({ sock, from, args, message }) {
    const t = parseTime(args.join(' '));
    if (!t) return sock.sendMessage(from, { text: '❌ Usage: closetime 8:30pm' }, { quoted: message });
    setCloseTime(from, t); startGroupScheduler(sock);
    return sock.sendMessage(from, { text: `✅ Group close time set to ${t.label} daily.` }, { quoted: message });
  }
};
