const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7MzHT1SWt0T3G06p0M';

export default {
  name: 'bchannel',
  aliases: ['botchannel', 'channel'],
  category: 'utility',
  description: 'Share official bot channel link',
  usage: 'bchannel',
  cooldown: 3,

  async execute({ sock, message, from }) {
    return sock.sendMessage(from, {
      text: `📢 *Bot Channel*\n\nFollow for more updates and features:\n${CHANNEL_LINK}`
    }, { quoted: message });
  }
};
