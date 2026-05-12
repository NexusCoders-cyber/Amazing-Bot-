import yts from 'yt-search';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '../../cache/video_temp');
const MAX_UNCOMPRESSED = 35 * 1024 * 1024; // 35MB — skip compression if under this

function parseCount(raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1) return 1;
    return Math.min(n, 2);
}

function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

async function getDownloadUrl(videoUrl) {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
    const apis = [
        { url: 'https://dev-priyanshi.onrender.com/api/alldl', params: { url: videoUrl } },
        { url: 'https://apis.prexzyvilla.site/download/aio', params: { url: videoUrl } },
        { url: 'https://v3.ketudownload.site/api/ketudownload', params: { url: videoUrl, type: 'mp4' } }
    ];

    for (const api of apis) {
        try {
            const { data } = await axios.get(api.url, {
                params: api.params,
                timeout: 20000,
                headers: { 'User-Agent': ua, 'Accept': 'application/json' }
            });
            const d = data?.data || data?.result || data || {};
            for (const key of ['low', 'sd', 'url', 'download', 'video', 'high', 'hd', 'direct', 'link']) {
                const val = d[key];
                if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) return val;
            }
        } catch {}
    }
    return null;
}

function compressFast(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .size('?x480')
            .videoBitrate('600k')
            .audioBitrate('64k')
            .outputOptions([
                '-preset ultrafast',
                '-crf 30',
                '-movflags +faststart'
            ])
            .on('end', () => resolve(outputPath))
            .on('error', reject)
            .save(outputPath);
    });
}

export default {
    name: 'video',
    aliases: ['ytmp4', 'getvideo'],
    category: 'media',
    description: 'Search and download YouTube videos (compressed)',
    usage: 'video <query> [count]',
    cooldown: 12,
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const count = parseCount(args[args.length - 1]);
        const keyword = Number.isNaN(Number.parseInt(args[args.length - 1], 10))
            ? args.join(' ').trim()
            : args.slice(0, -1).join(' ').trim();

        if (!keyword) {
            return await sock.sendMessage(from, {
                text: '🎬 Usage: `.video <query> [count]`\nMax: 2 videos.'
            }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });

        try {
            const search = await yts(keyword);
            const videos = (search?.videos || []).slice(0, count);

            if (!videos.length) {
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                return await sock.sendMessage(from, { text: '❌ No videos found.' }, { quoted: message });
            }

            await fs.ensureDir(TEMP_DIR);
            let sent = 0;

            for (let i = 0; i < videos.length; i++) {
                try {
                    const v = videos[i];
                    const downloadUrl = await getDownloadUrl(v.url);
                    if (!downloadUrl) continue;

                    const rawPath = path.join(TEMP_DIR, `raw_${Date.now()}_${i}.mp4`);

                    // Download
                    const resp = await axios.get(downloadUrl, {
                        responseType: 'arraybuffer',
                        timeout: 180000,
                        maxContentLength: 300 * 1024 * 1024,
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': 'https://www.youtube.com/'
                        }
                    });
                    const rawBuf = Buffer.from(resp.data);

                    // If already small enough, send directly
                    if (rawBuf.length <= MAX_UNCOMPRESSED) {
                        await sock.sendMessage(from, {
                            video: rawBuf,
                            mimetype: 'video/mp4',
                            caption: `🎬 *${v.title}*\n⏱ ${formatDuration(v.duration?.seconds)}`
                        }, { quoted: message });
                        sent++;
                        continue;
                    }

                    // Compress only if needed
                    await fs.writeFile(rawPath, rawBuf);
                    const outPath = path.join(TEMP_DIR, `out_${Date.now()}_${i}.mp4`);
                    await compressFast(rawPath, outPath);
                    const buffer = await fs.readFile(outPath);

                    await fs.remove(rawPath).catch(() => {});
                    await fs.remove(outPath).catch(() => {});

                    if (!buffer || buffer.length < 2048) continue;

                    await sock.sendMessage(from, {
                        video: buffer,
                        mimetype: 'video/mp4',
                        caption: `🎬 *${v.title}*\n⏱ ${formatDuration(v.duration?.seconds)}`
                    }, { quoted: message });
                    sent++;
                } catch {}
            }

            if (sent > 0) {
                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
            } else {
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                await sock.sendMessage(from, { text: '❌ Could not download.' }, { quoted: message });
            }

        } catch (e) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(from, { text: `❌ error: ${e.message}` }, { quoted: message });
        }
    }
};
