import axios from 'axios';

const API_BASE = 'https://apis.malvryx.dev';
const START_ENDPOINT = `${API_BASE}/api/downloader/aiovdl1`;
const TASK_ENDPOINT = `${API_BASE}/api/downloader/aiovdl1-task`;
const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 180000;
const HTTP_TIMEOUT = 30000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(rawArgs = []) {
    const tokens = Array.isArray(rawArgs) ? rawArgs : String(rawArgs || '').trim().split(/\s+/);
    let format = 'mp4';
    let quality = 'best';
    let url = '';

    for (let i = 0; i < tokens.length; i++) {
        const t = String(tokens[i] || '').trim();
        if (!t) continue;

        if (t === '--format' || t === '-f') {
            format = String(tokens[i + 1] || '').toLowerCase();
            i++;
            continue;
        }
        if (t.startsWith('--format=')) {
            format = t.split('=')[1]?.toLowerCase() || format;
            continue;
        }
        if (t === '--quality' || t === '-q') {
            quality = String(tokens[i + 1] || '').toLowerCase();
            i++;
            continue;
        }
        if (t.startsWith('--quality=')) {
            quality = t.split('=')[1]?.toLowerCase() || quality;
            continue;
        }
        if (!url && /^https?:\/\//i.test(t)) {
            url = t;
        }
    }

    const allowedFormats = new Set(['mp4', 'mp3', 'webm']);
    const allowedQuality = new Set(['best', 'worst', '1080', '720', '480', '360']);
    if (!allowedFormats.has(format)) format = 'mp4';
    if (!allowedQuality.has(quality)) quality = 'best';

    return { url, format, quality };
}

function pickTaskId(payload) {
    return payload?.result?.taskId || payload?.taskId || null;
}

function pickStatus(payload) {
    return String(payload?.result?.status || payload?.status || '').toLowerCase();
}

function pickResult(payload) {
    return payload?.result || null;
}

function buildCaption(result, outFormat, outQuality) {
    const platform = result?.platform || 'Unknown';
    const title = String(result?.title || 'Downloaded Media').slice(0, 120);
    const uploader = String(result?.uploader || 'N/A').slice(0, 60);
    const size = result?.download?.filesize || 'N/A';

    return `✅ *AIO VDL RESULT*\n\n` +
        `🌐 Platform: ${platform}\n` +
        `🎬 Title: ${title}\n` +
        `👤 Uploader: ${uploader}\n` +
        `🎞️ Format: ${outFormat}\n` +
        `📺 Quality: ${outQuality}\n` +
        `📦 Size: ${size}`;
}

export default {
    name: 'vdl',
    aliases: ['aiovdl'],
    category: 'downloader',
    description: 'All-in-one video downloader via Malvryx API.',
    usage: 'vdl <url> | vdl -f mp3 -q best <url>',
    cooldown: 5,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            const { url, format, quality } = parseArgs(args);
            if (!url) {
                return await sock.sendMessage(from, {
                    text:
                        `📥 *VDL Usage*\n\n` +
                        `• .vdl <url>\n` +
                        `• .vdl -f mp3 <url>\n` +
                        `• .vdl -q 720 <url>\n` +
                        `• .vdl -f mp4 -q best <url>\n\n` +
                        `Formats: mp4, mp3, webm\n` +
                        `Quality: best, worst, 1080, 720, 480, 360`
                }, { quoted: message });
            }

            const apiKey = process.env.MALVRYX_API_KEY;
            if (!apiKey) {
                return await sock.sendMessage(from, {
                    text: '❌ MALVRYX_API_KEY is missing in environment variables.'
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: `⏳ Starting VDL task...\nFormat: ${format}\nQuality: ${quality}`
            }, { quoted: message });

            const startRes = await axios.get(START_ENDPOINT, {
                params: { url, format, quality },
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    'User-Agent': 'Mozilla/5.0',
                    Accept: 'application/json'
                },
                timeout: HTTP_TIMEOUT,
                validateStatus: () => true
            });

            if (startRes.status < 200 || startRes.status >= 300) {
                throw new Error(`Start request failed (HTTP ${startRes.status})`);
            }
            if (String(startRes.data?.status || '').toLowerCase() !== 'success') {
                throw new Error(startRes.data?.message || 'API did not accept request');
            }

            const taskId = pickTaskId(startRes.data);
            if (!taskId) throw new Error('No taskId returned from API');

            const started = Date.now();
            let lastPayload = null;

            while (Date.now() - started < POLL_TIMEOUT) {
                await sleep(POLL_INTERVAL);

                const pollRes = await axios.get(TASK_ENDPOINT, {
                    params: { taskId },
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey,
                        'User-Agent': 'Mozilla/5.0',
                        Accept: 'application/json'
                    },
                    timeout: HTTP_TIMEOUT,
                    validateStatus: () => true
                });

                if (pollRes.status < 200 || pollRes.status >= 300) continue;
                const payload = pollRes.data || {};
                lastPayload = payload;

                const status = pickStatus(payload);
                const result = pickResult(payload);

                if (status === 'failed' || status === 'error') {
                    throw new Error(result?.message || payload?.message || 'Download task failed');
                }

                if (status === 'completed' || status === 'done' || result?.download?.url) {
                    const dl = result?.download || {};
                    const downloadUrl = dl.url;
                    if (!downloadUrl) throw new Error('Completed but no download URL returned');

                    const mediaRes = await axios.get(downloadUrl, {
                        responseType: 'arraybuffer',
                        timeout: HTTP_TIMEOUT
                    });
                    const media = Buffer.from(mediaRes.data);

                    const outFormat = String(dl.format || format || 'mp4').toLowerCase();
                    const outQuality = dl.quality || quality || 'best';
                    const filename = dl.filename || `vdl_${Date.now()}.${outFormat}`;
                    const caption = buildCaption(result, outFormat, outQuality);

                    if (outFormat === 'mp3') {
                        return await sock.sendMessage(from, {
                            audio: media,
                            mimetype: 'audio/mpeg',
                            fileName: filename,
                            ptt: false
                        }, { quoted: message });
                    }

                    if (outFormat === 'mp4' || outFormat === 'webm') {
                        return await sock.sendMessage(from, {
                            video: media,
                            mimetype: outFormat === 'webm' ? 'video/webm' : 'video/mp4',
                            caption
                        }, { quoted: message });
                    }

                    return await sock.sendMessage(from, {
                        document: media,
                        fileName: filename,
                        mimetype: 'application/octet-stream',
                        caption
                    }, { quoted: message });
                }
            }

            return await sock.sendMessage(from, {
                text: `❌ VDL timeout.\nTask: ${taskId}\nLast status: ${pickStatus(lastPayload) || 'unknown'}`
            }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, {
                text: `❌ vdl error: ${error.message}`
            }, { quoted: message });
        }
    }
};
