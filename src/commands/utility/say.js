import gtts from 'node-gtts';
import fs from 'fs';
import path from 'path';

const tts = gtts('en');
const TEMP_DIR = path.join(process.cwd(), 'temp');

export default {
    name: 'say',
    category: 'utility',
    description: 'Convert text to voice note',
    usage: 'say <text>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const text = args.join(' ').trim();
        const out = path.join(TEMP_DIR, `say_${Date.now()}.mp3`);

        try {
            await fs.promises.mkdir(TEMP_DIR, { recursive: true });
            await new Promise((resolve, reject) => {
                tts.save(out, text, (err) => (err ? reject(err) : resolve()));
            });
            const audio = await fs.promises.readFile(out);
            await sock.sendMessage(from, { audio, mimetype: 'audio/mpeg', ptt: true }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ TTS failed: ${error.message}` }, { quoted: message });
        } finally {
            if (fs.existsSync(out)) await fs.promises.unlink(out);
        }
    }
};
