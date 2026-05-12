function parseNumber(arg = '') {
  return arg
    .replace(/[^0-9]/g, '')
    .trim();
}

export default {
  name: 'adduser',
  aliases: ['invite'],
  category: 'admin',
  description: 'Add a single member to the group',
  usage: 'adduser <number>',
  example: 'adduser 2347085663318',
  cooldown: 3,
  permissions: ['admin'],
  args: true,
  minArgs: 1,
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,

  async execute({ sock, message, args, from }) {
    const reply = async (text) => sock.sendMessage(from, { text }, { quoted: message });

    try {
      const num = parseNumber(args[0]);
      if (!num || num.length < 10 || num.startsWith('0')) {
        return await reply('❌ Provide a valid international number (no leading 0).');
      }

      const jid = `${num}@s.whatsapp.net`;
      const status = await sock.groupParticipantsUpdate(from, [jid], 'add')
        .then((r) => String(r?.[0]?.status || ''))
        .catch(() => 'error');

      if (status === '200') {
        await reply(`✅ User ${num} added successfully.`);
      } else if (status === '409') {
        await reply(`⚠️ User ${num} is already in the group.`);
      } else {
        await reply(`❌ Failed to add ${num}. Status: ${status}`);
      }
    } catch (error) {
      await reply(`❌ Add failed: ${error.message}`);
    }
  }
};
