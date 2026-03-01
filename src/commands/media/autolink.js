import axios from "axios";
import fs from "fs-extra";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const groupSettings = new Map();
const downloadQueue = new Map();
const userDownloadLimits = new Map();

const supportedPlatforms = {
    youtube: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu\.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
    facebook: /^(https?:\/\/)?((?:www|m|web)\.)?(facebook|fb)\.(com|watch)\/.*$/,
    instagram: /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(?:p|reel)\/([A-Za-z0-9\-_]+)/,
    tiktok: /^(https?:\/\/)?(www\.)?(tiktok\.com)\/.*\/video\/(\d+)/,
    twitter: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/
};

const HOURLY_LIMIT = 25;
const SETTINGS_FILE = path.join(__dirname, '../../cache/autolink_settings.json');

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            Object.entries(data).forEach(([key, value]) => {
                groupSettings.set(key, value);
            });
        }
    } catch (error) {
        console.error('Error loading autolink settings:', error);
    }
}

function saveSettings() {
    try {
        const data = Object.fromEntries(groupSettings);
        fs.ensureDirSync(path.dirname(SETTINGS_FILE));
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving autolink settings:', error);
    }
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
    for (const [platform, regex] of Object.entries(supportedPlatforms)) {
        const matches = text.matchAll(new RegExp(regex, 'g'));
        for (const match of matches) {
            urls.push({ url: match[0], platform });
        }
    }
    return urls;
}

async function getVideoData(url) {
    try {
        const encodedUrl = encodeURIComponent(url);
        const response = await axios.get(`https://dev-priyanshi.onrender.com/api/alldl?url=${encodedUrl}`, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data.status || !response.data.data) {
            throw new Error('Invalid API response');
        }

        const data = response.data.data;
        const downloadUrl = data.high || data.low;
        
        if (!downloadUrl) {
            throw new Error('No download URL found');
        }

        return {
            title: data.title || 'Video',
            thumbnail: data.thumbnail,
            downloadUrl: downloadUrl,
            quality: data.high ? 'High' : 'Low'
        };
    } catch (error) {
        throw new Error(`Failed to get video data: ${error.message}`);
    }
}

async function downloadVideo(videoData, chatId) {
    try {
        const videoPath = path.join(__dirname, `../../cache/temp_video_${chatId}_${Date.now()}.mp4`);
        fs.ensureDirSync(path.dirname(videoPath));

        const videoResponse = await axios({
            url: videoData.downloadUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const writer = fs.createWriteStream(videoPath);
        videoResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(videoPath));
            writer.on('error', reject);
            
            setTimeout(() => {
                writer.destroy();
                reject(new Error('Download timeout'));
            }, 120000);
        });
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
}

loadSettings();

export default {
    name: 'autolink',
    aliases: ['autodl', 'autodownload'],
    category: 'media',
    description: 'Auto-download videos from social media links',
    usage: 'autolink <on|off|status>',
    example: 'autolink on',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,
    groupOnly: true,

    async execute({ sock, message, args, from, sender, prefix, isGroupAdmin }) {
        if (!args || args.length === 0) {
            return await sock.sendMessage(from, {
                text: '📱 Autolink Commands:\n\n' +
                      '• ' + prefix + 'autolink on - Enable auto download\n' +
                      '• ' + prefix + 'autolink off - Disable auto download\n' +
                      '• ' + prefix + 'autolink status - Check current status\n\n' +
                      '🎥 Supported platforms: ' + Object.keys(supportedPlatforms).join(', ')
            }, { quoted: message });
        }

        const command = args[0].toLowerCase();

        if (command === 'status') {
            const isEnabled = groupSettings.get(from) || false;
            const status = isEnabled ? 'enabled' : 'disabled';
            const limits = userDownloadLimits.get(sender) || { count: 0 };
            const remainingTime = limits.timestamp ? new Date(limits.timestamp + 3600000).toLocaleTimeString() : 'N/A';
            
            return await sock.sendMessage(from, {
                text: '📊 Auto Download Status:\n\n' +
                      '➤ Current state: ' + status + '\n' +
                      '➤ Your downloads: ' + limits.count + '/' + HOURLY_LIMIT + '\n' +
                      '➤ Resets at: ' + remainingTime + '\n' +
                      '➤ Quality: High (when available)\n' +
                      '➤ Supported: ' + Object.keys(supportedPlatforms).join(', ') + '\n\n' +
                      '💡 Just send any supported video link to auto-download!'
            }, { quoted: message });
        }

        if (!['on', 'off'].includes(command)) {
            return await sock.sendMessage(from, {
                text: '⚠️ Invalid command!\n\nUse: ' + prefix + 'autolink <on|off|status>'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ Admin Only\n\nOnly group admins can enable/disable autolink.'
            }, { quoted: message });
        }

        groupSettings.set(from, command === 'on');
        saveSettings();

        const statusEmoji = command === 'on' ? '✅' : '❌';
        const statusText = command === 'on' ? 'enabled' : 'disabled';
        
        await sock.sendMessage(from, {
            text: statusEmoji + ' Auto download ' + statusText + ' for this group!\n\n' +
                  (command === 'on' ? 
                      '🎯 Send any video link from: ' + Object.keys(supportedPlatforms).join(', ') + '\n' +
                      '⚡ Videos will be downloaded in high quality automatically!' :
                      '💤 Auto download is now disabled.')
        }, { quoted: message });
    }
};

export async function handleAutoDownload(sock, message, from, sender, text) {
    const isEnabled = groupSettings.get(from);
    if (!isEnabled || !from.endsWith('@g.us')) return false;

    const urls = extractValidUrls(text);
    if (urls.length === 0) return false;

    if (!checkRateLimit(sender)) {
        const limits = userDownloadLimits.get(sender);
        const resetTime = new Date(limits.timestamp + 3600000).toLocaleTimeString();
        await sock.sendMessage(from, {
            text: '⚠️ Rate limit reached!\n\n' +
                  '➤ Limit: ' + HOURLY_LIMIT + ' downloads per hour\n' +
                  '➤ Resets at: ' + resetTime + '\n\n' +
                  '💡 This prevents API abuse and ensures service stability.'
        }, { quoted: message });
        return true;
    }

    for (const { url, platform } of urls) {
        const threadQueue = downloadQueue.get(from) || new Set();

        if (threadQueue.has(url)) continue;
        threadQueue.add(url);
        downloadQueue.set(from, threadQueue);

        try {
            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            const videoData = await getVideoData(url);
            const videoPath = await downloadVideo(videoData, from);

            const caption = 
                '🎥 Auto-Downloaded Video\n\n' +
                '➤ Platform: ' + platform.charAt(0).toUpperCase() + platform.slice(1) + '\n' +
                '➤ Title: ' + videoData.title + '\n' +
                '➤ Quality: ' + videoData.quality + '\n\n' +
                '🔗 Original: ' + url;

            await sock.sendMessage(from, {
                video: { url: videoPath },
                caption: caption,
                mimetype: 'video/mp4'
            }, { quoted: message });

            try {
                fs.unlinkSync(videoPath);
                threadQueue.delete(url);
                await sock.sendMessage(from, {
                    react: { text: '✅', key: message.key }
                });
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
                await sock.sendMessage(from, {
                    react: { text: '❌', key: message.key }
                });
            }
        } catch (error) {
            console.error('Download error for ' + url + ':', error.message);
            
            threadQueue.delete(url);
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
            
            await sock.sendMessage(from, {
                text: '❌ Download failed for ' + platform + '\n\n' +
                      '➤ Error: ' + error.message + '\n' +
                      '➤ URL: ' + url + '\n\n' +
                      '💡 This might be due to: private content, expired link, or API issues.'
            }, { quoted: message });
        }
    }

    return true;
}