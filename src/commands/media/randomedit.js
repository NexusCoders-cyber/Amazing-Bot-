import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'randomedit',
    aliases: [],
    category: 'media',
    description: 'Send a random edit video',
    usage: 'randomedit',
    example: 'randomedit',
    cooldown: 10,
    permissions: ['user'],

    async execute({ sock, message, from }) {
        const cacheDir = path.join(__dirname, '..', '..', '..', 'temp');
        await fs.ensureDir(cacheDir);
        const outFile = path.join(cacheDir, `randomedit-${Date.now()}.mp4`);

        await sock.sendMessage(from, { text: '⏱️ Video is being sent, please wait...' }, { quoted: message });

        try {
            const { data } = await axios.get('https://api-edit-alightmotion.jonellmagallanes400.repl.co/cc/?apikey=editor', { timeout: 20000 });

            if (!data?.url) {
                throw new Error('API returned no video URL');
            }

            const streamRes = await axios.get(data.url, { responseType: 'stream', timeout: 30000 });
            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(outFile);
                streamRes.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            await sock.sendMessage(from, {
                text: 'Random Edit From TikTok',
                video: fs.createReadStream(outFile),
                mimetype: 'video/mp4'
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Edit API failed. Try again later or update the API endpoint.'
            }, { quoted: message });
        } finally {
            if (await fs.pathExists(outFile)) {
                await fs.remove(outFile);
            }
        }
    }
};
