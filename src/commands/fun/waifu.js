import axios from 'axios';

export default {
  name: 'waifu',
  aliases: ['wf', 'waifupic'],
  category: 'fun',
  description: 'Fetch and send a random waifu image',
  usage: 'waifu',
  cooldown: 5,
  async execute({ sock, message, from, prefix }) {
    try {
      await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });
      const searchMessage = await sock.sendMessage(from, { text: '🎀 *Searching for Waifu*...' }, { quoted: message });
      const response = await axios.get('https://api.nekosapi.com/v4/images/random', { timeout: 10000 });
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        await sock.sendMessage(from, { delete: searchMessage.key });
        return sock.sendMessage(from, { text: '❌ *Error*\nFailed to fetch waifu image.\n\n💡 Try again later!' }, { quoted: message });
      }
      const imageObj = response.data[Math.floor(Math.random() * response.data.length)];
      const imageUrl = imageObj.url;
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await sock.sendMessage(from, { delete: searchMessage.key });
      await sock.sendMessage(from, { image: { url: imageUrl }, caption: `🎀 *Your Waifu*!\n📸 Source: Nekos API\n\n💡 Use \`${prefix}waifu\` for another one!` }, { quoted: message });
    } catch (error) {
      await sock.sendMessage(from, { text: `❌ *Error*\nFailed to fetch waifu image: ${error.message}\n\n💡 Try again later!` }, { quoted: message });
    }
  }
};
