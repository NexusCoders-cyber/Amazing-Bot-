import axios from 'axios';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { uploadToImgBB } from '../../utils/imgbb.js';

const nanoProSessions = new Map();

function delay(ms = 1800) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function getSession(userId) {
    if (!nanoProSessions.has(userId)) nanoProSessions.set(userId, { images: [] });
    return nanoProSessions.get(userId);
}

async function extractImageUrlFromMessage(sock, message) {
    const quotedImage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    const directImage = message.message?.imageMessage;
    if (!quotedImage && !directImage) return '';

    const target = quotedImage ? { message: { imageMessage: quotedImage } } : message;
    const buffer = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
    if (!buffer) return '';
    return await uploadToImgBB(buffer);
}

export default {
    name: 'nanopro',
    aliases: ['nano-pro', 'nanobanana', 'nanobanana-pro'],
    category: 'ai',
    description: 'Nano Banana Pro: text-to-image and multi-image blend mode (max 4 images)',
    usage: 'nanopro <prompt> OR nanopro (reply image) then nanopro done <prompt>',
    cooldown: 5,

    async execute({ sock, message, from, args, sender, prefix }) {
        const input = args.join(' ').trim();
        const userId = sender || message.key?.participant || message.key?.remoteJid;
        const imageUrl = await extractImageUrlFromMessage(sock, message);
        const session = getSession(userId);

        if (imageUrl) {
            if (session.images.length >= 4) {
                return sock.sendMessage(from, {
                    text: '❌ Nano-banana-pro limit reached. Maximum images: 4.\nUse `.nanopro done <prompt>` to generate.'
                }, { quoted: message });
            }

            session.images.push(imageUrl);
            return sock.sendMessage(from, {
                text:
                    `✅ Image ${session.images.length}/4 added to Nano-banana-pro session.\n` +
                    `Send more images or finish with:\n${prefix || '.'}nanopro done <prompt>`
            }, { quoted: message });
        }

        const doneMatch = input.match(/^done\s+([\s\S]+)/i);
        if (doneMatch) {
            const finalPrompt = doneMatch[1].trim();
            if (!finalPrompt) {
                return sock.sendMessage(from, { text: '❌ Provide prompt: .nanopro done <prompt>' }, { quoted: message });
            }
            if (session.images.length < 2) {
                return sock.sendMessage(from, {
                    text: '⚠️ Nano-banana-pro needs at least 2 images. Reply to images with `.nanopro` first.'
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: `🎨 Blending ${session.images.length} images with Nano-banana-pro...`
            }, { quoted: message });

            let initUrl = 'https://omegatech-api.dixonomega.tech/api/ai/nanobana-pro-v3';
            const params = new URLSearchParams({ prompt: finalPrompt });
            session.images.forEach((url, idx) => params.append(`image${idx + 1}`, url));
            initUrl += `?${params.toString()}`;

            const { data: init } = await axios.get(initUrl, { timeout: 120000 });
            const directOut = init?.image || init?.image_url || init?.result?.image || init?.data?.image;
            if (directOut) {
                nanoProSessions.delete(userId);
                return sock.sendMessage(from, { image: { url: directOut }, caption: `✅ Nano-banana-pro success\n📝 Prompt: ${finalPrompt}` }, { quoted: message });
            }

            const taskId = init?.task_id || init?.id || init?.key || init?.result?.task_id;
            if (!taskId) throw new Error('No task_id returned from nanobana-pro-v3.');

            let resultUrl = '';
            for (let i = 0; i < 25; i++) {
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
                    throw new Error(check?.message || 'Nano-banana-pro failed on provider side.');
                }
            }

            nanoProSessions.delete(userId);

            if (!resultUrl) throw new Error(`Nano-banana-pro timed out. Task ID: ${taskId}`);

            return sock.sendMessage(from, {
                image: { url: resultUrl },
                caption: `✅ Nano-banana-pro success\n🖼️ Images: ${init?.images_used || session.images.length}\n📝 Prompt: ${finalPrompt}`
            }, { quoted: message });
        }

        if (!input) {
            return sock.sendMessage(from, {
                text:
                    '🍌 *Nano-banana-pro (supports multiple images max=4)*\n\n' +
                    `• Reply image + .nanopro to add it\n` +
                    `• Finish with: ${prefix || '.'}nanopro done <prompt>\n` +
                    `• Normal generation: ${prefix || '.'}nanopro <prompt>`
            }, { quoted: message });
        }

        await sock.sendMessage(from, { text: '🎨 Generating with Nano Banana Pro...' }, { quoted: message });
        await delay(1500);

        const { data } = await axios.get('https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro', {
            params: { prompt: input },
            timeout: 120000
        });

        const image = data?.image || data?.url || data?.result?.image || data?.data?.image || '';
        if (!image) {
            const taskId = data?.task_id || data?.key || data?.id || '';
            throw new Error(`No image URL returned${taskId ? ` (task: ${taskId})` : ''}`);
        }

        return sock.sendMessage(from, {
            image: { url: image },
            caption: `✅ Nano Pro result\nPrompt: ${input}`
        }, { quoted: message });
    }
};
