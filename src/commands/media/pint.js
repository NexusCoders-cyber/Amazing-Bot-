import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import os from 'os';
import font from '../../utils/font.js';

export default {
    name: 'pint',
    aliases: ['pinterest', 'pin'],
    category: 'media',
    description: 'Search and download Pinterest images',
    usage: 'pint <query> -<number>',
    example: 'pint nature -5',
    cooldown: 10,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        let count = 1;
        let queryArgs = [...args];
        const lastArg = queryArgs[queryArgs.length - 1];

        if (lastArg.startsWith('-')) {
            const num = parseInt(lastArg.replace('-', ''));
            if (!isNaN(num)) {
                count = Math.min(Math.max(num, 1), 10);
                queryArgs.pop();
            }
        }

        const query = queryArgs.join(' ');

        await sock.sendMessage(from, {
            react: { text: '📌', key: message.key }
        });

        try {
            const res = await axios.get(`https://api.vreden.my.id/api/v1/search/pinterest?query=${encodeURIComponent(query)}`, {
                timeout: 30000
            });

            const imageUrls = res.data.result.search_data;

            if (!imageUrls || imageUrls.length === 0) {
                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
                return await sock.sendMessage(from, {
                    text: `❌ No images found for: ${query}`
                }, { quoted: message });
            }

            const selection = imageUrls.slice(0, count);

            for (let i = 0; i < selection.length; i++) {
                const tempFilePath = path.join(os.tmpdir(), `pint_${Date.now()}_${i}.jpg`);

                try {
                    const response = await axios({
                        method: 'GET',
                        url: selection[i],
                        responseType: 'stream',
                        timeout: 60000
                    });

                    await pipeline(response.data, fs.createWriteStream(tempFilePath));

                    await sock.sendMessage(from, {
                        image: { url: tempFilePath },
                        caption: `📌 ${font.bold(query.toUpperCase())}\n\n${i + 1}/${selection.length}`
                    }, { quoted: message });

                    if (fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                } catch (downloadError) {
                    console.error(`Failed to download image ${i + 1}:`, downloadError);
                    if (fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                    continue;
                }
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Pinterest command error:', error);
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
            return await sock.sendMessage(from, {
                text: `❌ Failed: ${error.message}`
            }, { quoted: message });
        }
    }
};
