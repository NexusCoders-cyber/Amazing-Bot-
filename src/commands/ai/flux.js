import axios from 'axios';
import FormData from 'form-data';

async function uploadQuotedImage(sock, message) {
  try {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return null;
    const has = quoted.imageMessage || quoted.stickerMessage;
    if (!has) return null;
    const media = await sock.downloadMediaMessage({ message: quoted });
    const form = new FormData();
    form.append('file', media, { filename: 'image.jpg' });
    form.append('type', 'permanent');
    const { data } = await axios.post('https://tmp.malvryx.dev/upload', form, { headers: form.getHeaders(), timeout: 60000 });
    return data?.cdnUrl || data?.directUrl || null;
  } catch { return null; }
}

export default {
  name: 'flux', aliases: ['fluxedit'], category: 'ai', description: 'Flux 2 pro image generation/edit', usage: 'flux <prompt>', cooldown: 5,
  async execute({ sock, message, from, args, command, prefix }) {
    const prompt = args.join(' ').trim();
    if (!prompt) return sock.sendMessage(from, { text: `⚠️ Usage: ${prefix}${command} <prompt>` }, { quoted: message });
    await sock.sendMessage(from, { react: { text: '🎨', key: message.key } });
    try {
      const imageUrl = await uploadQuotedImage(sock, message);
      const baseUrl = 'https://omegatech-api.dixonomega.tech/api/ai';
      let initRes;
      if (imageUrl) {
        const { data } = await axios.post(`${baseUrl}/flux-pro2-edit`, { image1: imageUrl, prompt, aspect_ratio: 'auto' }, { timeout: 60000 });
        initRes = data;
      } else {
        const { data } = await axios.get(`${baseUrl}/flux-pro2`, { params: { prompt }, timeout: 60000 });
        initRes = data;
      }
      if (!initRes?.success || !initRes?.task_id) throw new Error('API failed to start task');
      let resultUrl = null;
      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const { data: check } = await axios.get(`${baseUrl}/nano-banana2-result`, { params: { task_id: initRes.task_id }, timeout: 40000 });
        if (check?.status === 'completed' && check?.image_url) { resultUrl = check.image_url; break; }
        if (check?.status === 'failed') throw new Error('Task failed on server');
      }
      if (!resultUrl) throw new Error('Generation timed out');
      await sock.sendMessage(from, { image: { url: resultUrl }, caption: `✨ *FLUX 2 PRO SUCCESS*\n\n📝 *Prompt:* ${prompt}` }, { quoted: message });
      await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
    } catch (e) {
      await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
      await sock.sendMessage(from, { text: `❌ *Error:* ${e.response?.data?.error || e.message}` }, { quoted: message });
    }
  }
};
