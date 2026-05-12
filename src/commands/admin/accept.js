export default {
  name: 'accept',
  aliases: ['acceptall', 'approveall', 'acceptjoin'],
  category: 'admin',
  description: 'Accept all pending group join requests',
  usage: 'accept',
  cooldown: 5,
  permissions: ['admin'],

  async execute({ sock, message, from }) {
    if (!from.endsWith('@g.us')) {
      return sock.sendMessage(from, { text: '❌ This command only works in groups.' }, { quoted: message });
    }

    try {
      const pending = await sock.groupRequestParticipantsList(from);
      if (!Array.isArray(pending) || !pending.length) {
        return sock.sendMessage(from, { text: '✅ No pending join requests.' }, { quoted: message });
      }

      const ids = pending.map((p) => p.jid || p.id).filter(Boolean);
      await sock.groupRequestParticipantsUpdate(from, ids, 'approve');
      return sock.sendMessage(from, { text: `✅ Approved ${ids.length} pending request(s).` }, { quoted: message });
    } catch (error) {
      return sock.sendMessage(from, {
        text: `❌ Failed to approve requests: ${error.message}\nYour Baileys version may not support join-request APIs.`
      }, { quoted: message });
    }
  }
};
