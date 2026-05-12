import ky from 'ky';
import fs from 'fs-extra';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const downloadQueue = new Map();
const userDownloadLimits = new Map();

const supportedPlatforms = {
    youtube: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu\.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/i,
    facebook: /^(https?:\/\/)?((?:www|m|web)\.)?(facebook|fb)\.(com|watch)\/.*$/i,
    instagram: /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(?:p|reel)\/([A-Za-z0-9\-_]+)/i,
    tiktok: /^(https?:\/\/)?((?:www|m|vm|vt)\.)?tiktok\.com\/.*$/i,
    twitter: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/i
};

const HOURLY_LIMIT = 25;
const GROUP_SETTINGS_FILE = path.join(__dirname, '../../cache/group_download_settings.json');

function loadGroupSettings() {
    try {
        if (fs.existsSync(GROUP_SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(GROUP_SETTINGS_FILE, 'utf8'));
        }
    } catch {}
    return {};
}

function saveGroupSettings(settings) {
    fs.ensureDirSync(path.dirname(GROUP_SETTINGS_FILE));
    fs.writeFileSync(GROUP_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = userDownloadLimits.get(userId) || { count: 0, timestamp: now };

    if (now - userLimit.timestamp > 3600000) {
        userDownloadLimits.set(userId, { count: 1, timestamp: now });
        return true;
    }

    if (userLimit.count >= HOURLY_LIMIT) return false;

    userLimit.count++;
    userDownloadLimits.set(userId, userLimit);
    return true;
}

function extractValidUrls(text) {
    const urls = [];
    const source = String(text || '');

    for (const [platform, regex] of Object.entries(supportedPlatforms)) {
        const matches = source.matchAll(new RegExp(regex, 'gi'));
        for (const match of matches) {
            urls.push({ url: match[0], platform });
        }
    }
    return urls;
}

async function getVideoData(url) {
    try {
        const response = await ky
            .get('https://dev-priyanshi.onrender.com/api/alldl', {
                searchParams: { url },
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            })
            .json();

        if (!response?.status || !response?.data) {
            throw new Error('Invalid api response');
        }

        const data = response.data;
        const downloadUrl = data.high || data.low;

        if (!downloadUrl) throw new Error('No download URL found');

        return {
            title: data.title || 'Video',
            thumbnail: data.thumbnail,
            downloadUrl,
            quality: data.high ? 'High' : 'Low'
        };
    } catch (error) {
        try {
            const backup = await ky.get('https://apis.prexzyvilla.site/download/aio', {
                searchParams: { url },
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            }).json();
            const data = backup?.result || backup?.data || backup;
            const downloadUrl = data?.high || data?.low || data?.url || data?.download || data?.video;
            if (!downloadUrl) throw new Error('No download URL found');
            return {
                title: data?.title || 'Video',
                thumbnail: data?.thumbnail || '',
                downloadUrl,
                quality: data?.high ? 'High' : 'Auto'
            };
        } catch (backupError) {
            throw new Error(`Failed to get video data: ${backupError.message || error.message}`);
        }
    }
}

async function downloadVideo(videoData, threadID) {
    const videoPath = path.join(__dirname, `../../cache/temp_video_${threadID}_${Date.now()}.mp4`);
    fs.ensureDirSync(path.dirname(videoPath));

    try {
        const response = await ky.get(videoData.downloadUrl, {
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(videoPath, buffer);
        return videoPath;
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
}

export default {
    name: 'autolink',
    aliases: ['autodl', 'autodownload'],
    category: 'media',
    description: 'Auto download supported links in group',
    usage: 'autolink <on|off|status>',
    example: 'autolink on',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,
    groupOnly: true,

    async execute({ sock, message, args, from, sender }) {
        const settings = loadGroupSettings();

        if (!args[0] || !['on', 'off', 'status'].includes(args[0].toLowerCase())) {
            return await sock.sendMessage(from, {
                text:
                    '📱 *Autolink Commands:*\n' +
                    '• `autolink on` - Enable auto download\n' +
                    '• `autolink off` - Disable auto download\n' +
                    '• `autolink status` - Check current status\n\n' +
                    `🎥 Supported platforms: ${Object.keys(supportedPlatforms).join(', ')}`
            }, { quoted: message });
        }

        const command = args[0].toLowerCase();

        if (command === 'status') {
            const status = settings[from] ? 'enabled' : 'disabled';
            const limits = userDownloadLimits.get(sender) || { count: 0 };
            const resetTime = new Date(Date.now() + 3600000).toLocaleTimeString();

            return await sock.sendMessage(from, {
                text:
                    `📊 *Auto Download Status:*\n` +
                    `➤ Current state: ${status}\n` +
                    `➤ Your downloads: ${limits.count}/${HOURLY_LIMIT} (resets at ${resetTime})\n` +
                    '➤ Quality: High (when available)\n' +
                    `➤ Supported: ${Object.keys(supportedPlatforms).join(', ')}\n\n` +
                    '💡 Just send any supported video link to auto-download!'
            }, { quoted: message });
        }

        settings[from] = command === 'on';
        saveGroupSettings(settings);

        const statusEmoji = command === 'on' ? '✅' : '❌';
        const statusText = command === 'on' ? 'enabled' : 'disabled';

        return await sock.sendMessage(from, {
            text:
                `${statusEmoji} Auto download ${statusText} for this chat!\n\n` +
                (command === 'on'
                    ? `🎯 Send any video link from: ${Object.keys(supportedPlatforms).join(', ')}\n⚡ Downloads will be in high quality automatically!`
                    : '💤 Auto download is now disabled.')
        }, { quoted: message });
    }
};

export async function handleAutoDownload(sock, message, from, sender, text) {
    const settings = loadGroupSettings();
    if (!settings[from]) return false;

    const urls = extractValidUrls(text || '');
    if (urls.length === 0) return false;

    if (!checkRateLimit(sender)) {
        const resetTime = new Date(Date.now() + 3600000).toLocaleTimeString();
        await sock.sendMessage(from, {
            text:
                '⚠️ Rate limit reached!\n' +
                `➤ Limit: ${HOURLY_LIMIT} downloads per hour\n` +
                `➤ Resets at: ${resetTime}\n\n` +
                '💡 This prevents api abuse and ensures service stability.'
        }, { quoted: message });
        return true;
    }

    for (const { url, platform } of urls) {
        const threadQueue = downloadQueue.get(from) || new Set();
        if (threadQueue.has(url)) continue;

        threadQueue.add(url);
        downloadQueue.set(from, threadQueue);

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const videoData = await getVideoData(url);
            const videoPath = await downloadVideo(videoData, from);

            await sock.sendMessage(from, {
                video: { url: videoPath },
                caption:
                    '🎥 Auto-Downloaded Video\n' +
                    `➤ Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}\n` +
                    `➤ Title: ${videoData.title}\n` +
                    `➤ Quality: ${videoData.quality}\n` +
                    `➤ Original: ${url}`
            }, { quoted: message });

            await fs.remove(videoPath).catch(() => {});
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error(`Download error for ${url}:`, error.message);
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(from, {
                text:
                    `❌ Download failed for ${platform}\n` +
                    `➤ Error: ${error.message}\n` +
                    `➤ URL: ${url}\n\n` +
                    '💡 This might be due to: private content, expired link, or api issues.'
            }, { quoted: message });
        } finally {
            threadQueue.delete(url);
        }
    }

    return true;
}
