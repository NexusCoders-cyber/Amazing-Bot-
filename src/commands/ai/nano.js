import axios from 'axios';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { uploadToImgBB } from '../../utils/imgbb.js';

function delay(ms = 1800) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export default {
    name: 'nano',
    aliases: ['nanogen'],
    category: 'ai',
    description: 'Nano image-to-image edit. Reply to image with prompt.',
    usage: 'nano <prompt> (reply to image)',
    minArgs: 1,
    cooldown: 5,

    async execute({ sock, message, from, args }) {
        const prompt = args.join(' ').trim();
        const quotedImage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        const directImage = message.message?.imageMessage;

        if (!prompt) return sock.sendMessage(from, { text: '❌ Provide prompt.' }, { quoted: message });
        if (!quotedImage && !directImage) {
            return sock.sendMessage(from, { text: '❌ Reply to an image with: .nano <prompt>' }, { quoted: message });
        }

        await sock.sendMessage(from, { text: '🛠️ Uploading image and processing edit...' }, { quoted: message });

        const target = quotedImage ? { message: { imageMessage: quotedImage } } : message;
        const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
        const publicUrl = await uploadToImgBB(buffer);

        const { data: init } = await axios.get('https://omegatech-api.dixonomega.tech/api/ai/nano-banana2', {
            params: { image: publicUrl, prompt },
            timeout: 120000
        });

        const providerImage = init?.image || init?.image_url || init?.result?.image || init?.data?.image;
        if (providerImage) {
            return sock.sendMessage(from, { image: { url: providerImage }, caption: `✅ Nano edit success\n📝 Prompt: ${prompt}` }, { quoted: message });
        }

        const taskId = init?.task_id || init?.key || init?.id || init?.result?.task_id;
        if (!taskId) throw new Error('No task_id received from nano-banana2 API.');

        let resultUrl = '';
        for (let i = 0; i < 24; i++) {
            await delay(5000);
            const { data: check } = await axios.get('https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result', {
                params: { task_id: taskId },
                timeout: 120000
            });

            const done = ['completed','success','done'].includes(String(check?.status || '').toLowerCase());
            const imageOut = check?.image_url || check?.image || check?.result?.image || check?.data?.image;
            if (done && imageOut) {
                resultUrl = imageOut;
                break;
            }

            if (check?.status === 'failed') {
                throw new Error(check?.message || 'Nano generation failed on provider side.');
            }
        }

        if (!resultUrl) {
            throw new Error(`Nano edit timed out. Task ID: ${taskId}`);
        }

        return sock.sendMessage(from, {
            image: { url: resultUrl },
            caption: `✅ Nano edit success\n📝 Prompt: ${prompt}`
        }, { quoted: message });
    }
};
