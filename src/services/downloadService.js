const axios = require('axios');
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const logger = require('../utils/logger');
const { cache } = require('../utils/cache');
const config = require('../config');

class DownloadService {
    constructor() {
        this.downloadQueue = new Map();
        this.activeDownloads = new Set();
        this.downloadStats = {
            total: 0,
            successful: 0,
            failed: 0,
            totalSize: 0
        };
        this.maxConcurrentDownloads = 3;
    }

    async downloadYouTube(url, format = 'video', quality = 'medium') {
        try {
            if (!ytdl.validateURL(url)) {
                throw new Error('Invalid YouTube URL');
            }

            const videoId = ytdl.getURLVideoID(url);
            const cacheKey = `yt_${format}_${quality}_${videoId}`;
            
            const cached = await cache.get(cacheKey);
            if (cached && await fs.pathExists(cached)) {
                logger.info(`Using cached download: ${videoId}`);
                return await fs.readFile(cached);
            }

            const info = await ytdl.getInfo(url);
            const videoInfo = {
                title: info.videoDetails.title,
                duration: parseInt(info.videoDetails.lengthSeconds),
                views: parseInt(info.videoDetails.viewCount),
                channel: info.videoDetails.author.name,
                thumbnail: info.videoDetails.thumbnails.pop()?.url
            };

            if (videoInfo.duration > 600) {
                throw new Error('Video too long (max 10 minutes)');
            }

            const tempDir = path.join(process.cwd(), 'temp', 'downloads');
            await fs.ensureDir(tempDir);

            let outputPath;
            let downloadStream;

            if (format === 'audio') {
                outputPath = path.join(tempDir, `${videoId}.mp3`);
                downloadStream = ytdl(url, {
                    filter: 'audioonly',
                    quality: 'highestaudio'
                });
            } else {
                outputPath = path.join(tempDir, `${videoId}.mp4`);
                const qualityMap = {
                    low: 'lowest',
                    medium: 'highest',
                    high: 'highestvideo'
                };
                
                downloadStream = ytdl(url, {
                    filter: format => format.container === 'mp4',
                    quality: qualityMap[quality] || 'highest'
                });
            }

            const writeStream = fs.createWriteStream(outputPath);
            downloadStream.pipe(writeStream);

            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                downloadStream.on('error', reject);
            });

            const buffer = await fs.readFile(outputPath);
            
            await cache.set(cacheKey, outputPath, 3600);
            this.downloadStats.successful++;
            this.downloadStats.totalSize += buffer.length;

            setTimeout(() => fs.remove(outputPath).catch(() => {}), 3600000);

            return { buffer, info: videoInfo };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('YouTube download failed:', error);
            throw error;
        }
    }

    async getYouTubeInfo(url) {
        try {
            if (!ytdl.validateURL(url)) {
                throw new Error('Invalid YouTube URL');
            }

            const videoId = ytdl.getURLVideoID(url);
            const cacheKey = `yt_info_${videoId}`;
            
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const info = await ytdl.getInfo(url);
            const videoInfo = {
                id: videoId,
                title: info.videoDetails.title,
                description: info.videoDetails.description?.substring(0, 200),
                duration: parseInt(info.videoDetails.lengthSeconds),
                views: parseInt(info.videoDetails.viewCount),
                likes: parseInt(info.videoDetails.likes) || 0,
                channel: {
                    name: info.videoDetails.author.name,
                    url: info.videoDetails.author.channel_url,
                    verified: info.videoDetails.author.verified || false
                },
                thumbnails: info.videoDetails.thumbnails,
                uploadDate: info.videoDetails.publishDate,
                category: info.videoDetails.category,
                keywords: info.videoDetails.keywords?.slice(0, 10) || [],
                isLiveContent: info.videoDetails.isLiveContent || false
            };

            await cache.set(cacheKey, videoInfo, 1800);
            return videoInfo;
        } catch (error) {
            logger.error('YouTube info fetch failed:', error);
            throw error;
        }
    }

    async downloadInstagram(url) {
        try {
            const response = await axios.get(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`);
            const postData = response.data;

            if (!postData.thumbnail_url) {
                throw new Error('Could not extract media URL');
            }

            const mediaResponse = await axios.get(postData.thumbnail_url, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            this.downloadStats.successful++;
            this.downloadStats.totalSize += mediaResponse.data.length;

            return {
                buffer: Buffer.from(mediaResponse.data),
                info: {
                    title: postData.title,
                    author: postData.author_name,
                    thumbnail: postData.thumbnail_url,
                    type: 'instagram'
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('Instagram download failed:', error);
            throw new Error('Failed to download Instagram media');
        }
    }

    async downloadTikTok(url) {
        try {
            const apiUrl = `https://api.tiktokv.com/aweme/v1/feed/?aweme_id=${this.extractTikTokId(url)}`;
            
            const response = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'TikTok/2021 (iPhone; iOS 14.0; Scale/2.00)'
                },
                timeout: 15000
            });

            const videoData = response.data.aweme_list?.[0];
            if (!videoData) {
                throw new Error('TikTok video not found');
            }

            const videoUrl = videoData.video.play_addr.url_list[0];
            const mediaResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'Referer': 'https://www.tiktok.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            this.downloadStats.successful++;
            this.downloadStats.totalSize += mediaResponse.data.length;

            return {
                buffer: Buffer.from(mediaResponse.data),
                info: {
                    title: videoData.desc,
                    author: videoData.author.nickname,
                    views: videoData.statistics.play_count,
                    likes: videoData.statistics.digg_count,
                    shares: videoData.statistics.share_count,
                    type: 'tiktok'
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('TikTok download failed:', error);
            throw new Error('Failed to download TikTok video');
        }
    }

    extractTikTokId(url) {
        const match = url.match(/(?:tiktok\.com\/)(?:@[\w.-]+\/video\/|v\/|embed\/|watch\?v=)?([\w.-]+)/);
        return match ? match[1] : null;
    }

    async downloadFacebook(url) {
        try {
            const response = await axios.post('https://www.getfvid.com/downloader', {
                url: url
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 20000
            });

            const videoUrlMatch = response.data.match(/href="([^"]*)".*?download.*?HD/i);
            if (!videoUrlMatch) {
                throw new Error('Could not extract Facebook video URL');
            }

            const videoUrl = videoUrlMatch[1];
            const mediaResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            this.downloadStats.successful++;
            this.downloadStats.totalSize += mediaResponse.data.length;

            return {
                buffer: Buffer.from(mediaResponse.data),
                info: {
                    type: 'facebook',
                    size: mediaResponse.data.length
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('Facebook download failed:', error);
            throw new Error('Failed to download Facebook video');
        }
    }

    async downloadTwitter(url) {
        try {
            const tweetId = this.extractTwitterId(url);
            if (!tweetId) {
                throw new Error('Invalid Twitter URL');
            }

            const apiUrl = `https://api.twitter.com/1.1/statuses/show.json?id=${tweetId}&include_entities=true`;
            
            const response = await axios.get(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${config.apis.twitter?.bearerToken}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const tweetData = response.data;
            const media = tweetData.extended_entities?.media?.[0];
            
            if (!media) {
                throw new Error('No media found in tweet');
            }

            let mediaUrl;
            if (media.type === 'video' || media.type === 'animated_gif') {
                const variants = media.video_info.variants.filter(v => v.content_type === 'video/mp4');
            let mediaUrl;
            if (media.type === 'video' || media.type === 'animated_gif') {
                const variants = media.video_info.variants.filter(v => v.content_type === 'video/mp4');
                mediaUrl = variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]?.url;
            } else {
                mediaUrl = media.media_url_https;
            }

            if (!mediaUrl) {
                throw new Error('Could not extract media URL');
            }

            const mediaResponse = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            this.downloadStats.successful++;
            this.downloadStats.totalSize += mediaResponse.data.length;

            return {
                buffer: Buffer.from(mediaResponse.data),
                info: {
                    title: tweetData.text,
                    author: tweetData.user.screen_name,
                    likes: tweetData.favorite_count,
                    retweets: tweetData.retweet_count,
                    type: 'twitter',
                    mediaType: media.type
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('Twitter download failed:', error);
            throw new Error('Failed to download Twitter media');
        }
    }

    extractTwitterId(url) {
        const match = url.match(/status\/(\d+)/);
        return match ? match[1] : null;
    }

    async downloadFromMediafire(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const downloadLinkMatch = response.data.match(/href="([^"]*)" class="input popsok"/);
            if (!downloadLinkMatch) {
                throw new Error('Could not extract MediaFire download link');
            }

            const downloadUrl = downloadLinkMatch[1];
            const fileResponse = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: config.media.download.maxFileSize || 100 * 1024 * 1024,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const filenameMatch = response.data.match(/<div class="filename">([^<]+)<\/div>/);
            const filename = filenameMatch ? filenameMatch[1] : 'download';

            this.downloadStats.successful++;
            this.downloadStats.totalSize += fileResponse.data.length;

            return {
                buffer: Buffer.from(fileResponse.data),
                info: {
                    filename,
                    size: fileResponse.data.length,
                    type: 'mediafire'
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('MediaFire download failed:', error);
            throw new Error('Failed to download from MediaFire');
        }
    }

    async downloadFromGoogleDrive(url) {
        try {
            const fileId = this.extractGoogleDriveId(url);
            if (!fileId) {
                throw new Error('Invalid Google Drive URL');
            }

            const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            
            const response = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: config.media.download.maxFileSize || 100 * 1024 * 1024,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            this.downloadStats.successful++;
            this.downloadStats.totalSize += response.data.length;

            return {
                buffer: Buffer.from(response.data),
                info: {
                    fileId,
                    size: response.data.length,
                    type: 'googledrive'
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('Google Drive download failed:', error);
            throw new Error('Failed to download from Google Drive');
        }
    }

    extractGoogleDriveId(url) {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    }

    async downloadPinterestImage(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const imageUrlMatch = response.data.match(/"url": "([^"]*\.(?:jpg|jpeg|png|gif|webp))/i);
            if (!imageUrlMatch) {
                throw new Error('Could not extract Pinterest image URL');
            }

            const imageUrl = imageUrlMatch[1].replace(/\\u002F/g, '/');
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.pinterest.com/'
                }
            });

            this.downloadStats.successful++;
            this.downloadStats.totalSize += imageResponse.data.length;

            return {
                buffer: Buffer.from(imageResponse.data),
                info: {
                    type: 'pinterest',
                    size: imageResponse.data.length
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('Pinterest download failed:', error);
            throw new Error('Failed to download Pinterest image');
        }
    }

    async downloadGeneric(url, options = {}) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: options.timeout || 60000,
                maxContentLength: options.maxSize || config.media.download.maxFileSize || 50 * 1024 * 1024,
                headers: {
                    'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ...options.headers
                }
            });

            const contentType = response.headers['content-type'] || '';
            const contentLength = parseInt(response.headers['content-length'] || '0');
            
            if (contentLength > (options.maxSize || 50 * 1024 * 1024)) {
                throw new Error('File too large');
            }

            this.downloadStats.successful++;
            this.downloadStats.totalSize += response.data.length;

            return {
                buffer: Buffer.from(response.data),
                info: {
                    contentType,
                    size: response.data.length,
                    type: 'generic'
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('Generic download failed:', error);
            throw error;
        }
    }

    detectPlatform(url) {
        const platforms = {
            youtube: /(?:youtube\.com|youtu\.be)/i,
            instagram: /instagram\.com/i,
            tiktok: /tiktok\.com/i,
            facebook: /(?:facebook\.com|fb\.watch)/i,
            twitter: /(?:twitter\.com|t\.co)/i,
            mediafire: /mediafire\.com/i,
            googledrive: /drive\.google\.com/i,
            pinterest: /pinterest\.com/i
        };

        for (const [platform, regex] of Object.entries(platforms)) {
            if (regex.test(url)) {
                return platform;
            }
        }

        return 'generic';
    }

    async smartDownload(url, options = {}) {
        try {
            this.downloadStats.total++;
            
            if (this.activeDownloads.size >= this.maxConcurrentDownloads) {
                throw new Error('Too many concurrent downloads. Please try again later.');
            }

            this.activeDownloads.add(url);
            
            const platform = this.detectPlatform(url);
            let result;

            switch (platform) {
                case 'youtube':
                    result = await this.downloadYouTube(url, options.format, options.quality);
                    break;
                case 'instagram':
                    result = await this.downloadInstagram(url);
                    break;
                case 'tiktok':
                    result = await this.downloadTikTok(url);
                    break;
                case 'facebook':
                    result = await this.downloadFacebook(url);
                    break;
                case 'twitter':
                    result = await this.downloadTwitter(url);
                    break;
                case 'mediafire':
                    result = await this.downloadFromMediafire(url);
                    break;
                case 'googledrive':
                    result = await this.downloadFromGoogleDrive(url);
                    break;
                case 'pinterest':
                    result = await this.downloadPinterestImage(url);
                    break;
                default:
                    result = await this.downloadGeneric(url, options);
                    break;
            }

            result.platform = platform;
            return result;
        } finally {
            this.activeDownloads.delete(url);
        }
    }

    async convertAudio(inputPath, outputFormat = 'mp3') {
        return new Promise((resolve, reject) => {
            const outputPath = inputPath.replace(path.extname(inputPath), `.${outputFormat}`);
            
            const ffmpeg = spawn('ffmpeg', [
                '-i', inputPath,
                '-acodec', outputFormat === 'mp3' ? 'libmp3lame' : 'aac',
                '-ab', '128k',
                '-y',
                outputPath
            ]);

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });

            ffmpeg.on('error', reject);
        });
    }

    async convertVideo(inputPath, outputFormat = 'mp4') {
        return new Promise((resolve, reject) => {
            const outputPath = inputPath.replace(path.extname(inputPath), `.${outputFormat}`);
            
            const ffmpeg = spawn('ffmpeg', [
                '-i', inputPath,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-preset', 'fast',
                '-crf', '23',
                '-y',
                outputPath
            ]);

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });

            ffmpeg.on('error', reject);
        });
    }

    getDownloadStats() {
        return {
            ...this.downloadStats,
            activeDownloads: this.activeDownloads.size,
            queuedDownloads: this.downloadQueue.size,
            successRate: this.downloadStats.total > 0 ? 
                (this.downloadStats.successful / this.downloadStats.total * 100).toFixed(2) + '%' : '0%',
            totalSizeMB: (this.downloadStats.totalSize / (1024 * 1024)).toFixed(2)
        };
    }

    clearCache() {
        const tempDir = path.join(process.cwd(), 'temp', 'downloads');
        fs.emptyDir(tempDir).catch(() => {});
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    async downloadSpotify(url) {
        try {
            const trackId = this.extractSpotifyId(url);
            if (!trackId) {
                throw new Error('Invalid Spotify URL');
            }

            const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${await this.getSpotifyToken()}`
                }
            });

            const track = response.data;
            
            const searchQuery = `${track.artists[0].name} ${track.name}`;
            const ytSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(searchQuery)}&type=video&key=${config.apis.youtube.apiKey}`;
            
            const ytResponse = await axios.get(ytSearchUrl);
            const videoId = ytResponse.data.items[0]?.id?.videoId;
            
            if (!videoId) {
                throw new Error('Could not find YouTube equivalent');
            }

            const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const result = await this.downloadYouTube(ytUrl, 'audio');
            
            result.info = {
                ...result.info,
                spotifyData: {
                    name: track.name,
                    artists: track.artists.map(a => a.name),
                    album: track.album.name,
                    duration: track.duration_ms,
                    popularity: track.popularity,
                    preview_url: track.preview_url
                }
            };

            return result;
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('Spotify download failed:', error);
            throw new Error('Failed to download Spotify track');
        }
    }

    extractSpotifyId(url) {
        const match = url.match(/track\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    async getSpotifyToken() {
        const cacheKey = 'spotify_token';
        let token = await cache.get(cacheKey);
        
        if (!token) {
            const response = await axios.post('https://accounts.spotify.com/api/token', 
                'grant_type=client_credentials', {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${config.apis.spotify.clientId}:${config.apis.spotify.clientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            token = response.data.access_token;
            await cache.set(cacheKey, token, response.data.expires_in - 60);
        }
        
        return token;
    }

    async downloadSoundcloud(url) {
        try {
            const response = await axios.get(`https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${config.apis.soundcloud?.clientId}`, {
                timeout: 15000
            });

            const track = response.data;
            
            if (!track.media?.transcodings) {
                throw new Error('No audio streams found');
            }

            const mp3Stream = track.media.transcodings.find(t => t.format.mime_type === 'audio/mpeg');
            if (!mp3Stream) {
                throw new Error('MP3 stream not available');
            }

            const streamResponse = await axios.get(`${mp3Stream.url}?client_id=${config.apis.soundcloud?.clientId}`);
            const audioResponse = await axios.get(streamResponse.data.url, {
                responseType: 'arraybuffer',
                timeout: 120000
            });

            this.downloadStats.successful++;
            this.downloadStats.totalSize += audioResponse.data.length;

            return {
                buffer: Buffer.from(audioResponse.data),
                info: {
                    title: track.title,
                    artist: track.user.username,
                    duration: track.duration,
                    plays: track.playback_count,
                    likes: track.favoritings_count,
                    genre: track.genre,
                    type: 'soundcloud'
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('SoundCloud download failed:', error);
            throw new Error('Failed to download SoundCloud track');
        }
    }

    async downloadBandcamp(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const trackDataMatch = response.data.match(/data-tralbum="([^"]+)"/);
            if (!trackDataMatch) {
                throw new Error('Could not extract Bandcamp track data');
            }

            const trackData = JSON.parse(trackDataMatch[1].replace(/&quot;/g, '"'));
            const track = trackData.trackinfo[0];
            
            if (!track.file) {
                throw new Error('No audio file available');
            }

            const audioUrl = track.file['mp3-128'];
            const audioResponse = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 120000
            });

            this.downloadStats.successful++;
            this.downloadStats.totalSize += audioResponse.data.length;

            return {
                buffer: Buffer.from(audioResponse.data),
                info: {
                    title: track.title,
                    artist: trackData.artist,
                    album: trackData.current.title,
                    duration: track.duration,
                    type: 'bandcamp'
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('Bandcamp download failed:', error);
            throw new Error('Failed to download Bandcamp track');
        }
    }

    async downloadReddit(url) {
        try {
            const postId = this.extractRedditId(url);
            const apiUrl = `https://www.reddit.com/api/info.json?id=t3_${postId}`;
            
            const response = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const post = response.data.data.children[0]?.data;
            if (!post) {
                throw new Error('Reddit post not found');
            }

            let mediaUrl = null;
            
            if (post.url.includes('.jpg') || post.url.includes('.png') || post.url.includes('.gif')) {
                mediaUrl = post.url;
            } else if (post.media?.reddit_video?.fallback_url) {
                mediaUrl = post.media.reddit_video.fallback_url;
            } else if (post.preview?.images?.[0]?.source?.url) {
                mediaUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&');
            }

            if (!mediaUrl) {
                throw new Error('No media found in Reddit post');
            }

            const mediaResponse = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            this.downloadStats.successful++;
            this.downloadStats.totalSize += mediaResponse.data.length;

            return {
                buffer: Buffer.from(mediaResponse.data),
                info: {
                    title: post.title,
                    subreddit: post.subreddit,
                    author: post.author,
                    upvotes: post.ups,
                    comments: post.num_comments,
                    type: 'reddit'
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('Reddit download failed:', error);
            throw new Error('Failed to download Reddit media');
        }
    }

    extractRedditId(url) {
        const match = url.match(/\/comments\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    async downloadImgur(url) {
        try {
            const imgurId = this.extractImgurId(url);
            if (!imgurId) {
                throw new Error('Invalid Imgur URL');
            }

            const apiUrl = `https://api.imgur.com/3/image/${imgurId}`;
            const response = await axios.get(apiUrl, {
                headers: {
                    'Authorization': `Client-ID ${config.apis.imgur?.clientId || 'default'}`
                }
            });

            const imageData = response.data.data;
            const mediaResponse = await axios.get(imageData.link, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            this.downloadStats.successful++;
            this.downloadStats.totalSize += mediaResponse.data.length;

            return {
                buffer: Buffer.from(mediaResponse.data),
                info: {
                    title: imageData.title || 'Untitled',
                    description: imageData.description,
                    views: imageData.views,
                    size: imageData.size,
                    type: 'imgur'
                }
            };
        } catch (error) {
            this.downloadStats.failed++;
            logger.error('Imgur download failed:', error);
            throw new Error('Failed to download Imgur media');
        }
    }

    extractImgurId(url) {
        const match = url.match(/imgur\.com\/(?:a\/|gallery\/)?([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    async detectPlatformAdvanced(url) {
        const platforms = {
            youtube: /(?:youtube\.com|youtu\.be)/i,
            instagram: /instagram\.com/i,
            tiktok: /tiktok\.com/i,
            facebook: /(?:facebook\.com|fb\.watch)/i,
            twitter: /(?:twitter\.com|t\.co|x\.com)/i,
            spotify: /spotify\.com/i,
            soundcloud: /soundcloud\.com/i,
            bandcamp: /bandcamp\.com/i,
            reddit: /reddit\.com/i,
            imgur: /imgur\.com/i,
            mediafire: /mediafire\.com/i,
            googledrive: /drive\.google\.com/i,
            pinterest: /pinterest\.com/i,
            twitch: /twitch\.tv/i,
            dailymotion: /dailymotion\.com/i,
            vimeo: /vimeo\.com/i
        };

        for (const [platform, regex] of Object.entries(platforms)) {
            if (regex.test(url)) {
                return platform;
            }
        }

        return 'generic';
    }

    async getDownloadProgress(url) {
        return this.downloadQueue.get(url) || { status: 'not_found', progress: 0 };
    }

    async cancelDownload(url) {
        if (this.activeDownloads.has(url)) {
            this.activeDownloads.delete(url);
            this.downloadQueue.delete(url);
            return true;
        }
        return false;
    }

    async validateDownloadUrl(url) {
        if (!this.isValidUrl(url)) {
            return { valid: false, reason: 'Invalid URL format' };
        }

        const platform = this.detectPlatform(url);
        const supportedPlatforms = this.getSupportedPlatforms();
        
        if (!supportedPlatforms.some(p => p.toLowerCase().includes(platform))) {
            return { valid: false, reason: 'Unsupported platform' };
        }

        try {
            const response = await axios.head(url, { timeout: 5000 });
            return { valid: true, accessible: response.status === 200 };
        } catch (error) {
            return { valid: false, reason: 'URL not accessible' };
        }
    }

    generateDownloadReport() {
        const stats = this.getDownloadStats();
        
        return `📥 *Download Service Report*

📊 *Statistics:*
├ Total Downloads: ${stats.total}
├ Successful: ${stats.successful}
├ Failed: ${stats.failed}
├ Success Rate: ${stats.successRate}
├ Active Downloads: ${stats.activeDownloads}
╰ Total Size: ${stats.totalSizeMB} MB

🌐 *Supported Platforms:*
${this.getSupportedPlatforms().map(p => `• ${p}`).join('\n')}

⚡ *Performance:*
├ Queue Length: ${stats.queuedDownloads}
├ Cache Status: Active
╰ Auto-cleanup: Enabled

_Generated: ${new Date().toLocaleString()}_`;
    }
}

const downloadService = new DownloadService();

module.exports = {
    downloadService,
    downloadYouTube: (url, format, quality) => downloadService.downloadYouTube(url, format, quality),
    getYouTubeInfo: (url) => downloadService.getYouTubeInfo(url),
    downloadInstagram: (url) => downloadService.downloadInstagram(url),
    downloadTikTok: (url) => downloadService.downloadTikTok(url),
    downloadFacebook: (url) => downloadService.downloadFacebook(url),
    downloadTwitter: (url) => downloadService.downloadTwitter(url),
    downloadSpotify: (url) => downloadService.downloadSpotify(url),
    downloadSoundcloud: (url) => downloadService.downloadSoundcloud(url),
    downloadBandcamp: (url) => downloadService.downloadBandcamp(url),
    downloadReddit: (url) => downloadService.downloadReddit(url),
    downloadImgur: (url) => downloadService.downloadImgur(url),
    downloadFromMediafire: (url) => downloadService.downloadFromMediafire(url),
    downloadFromGoogleDrive: (url) => downloadService.downloadFromGoogleDrive(url),
    downloadPinterestImage: (url) => downloadService.downloadPinterestImage(url),
    smartDownload: (url, options) => downloadService.smartDownload(url, options),
    convertAudio: (input, format) => downloadService.convertAudio(input, format),
    convertVideo: (input, format) => downloadService.convertVideo(input, format),
    detectPlatform: (url) => downloadService.detectPlatform(url),
    validateDownloadUrl: (url) => downloadService.validateDownloadUrl(url),
    getDownloadProgress: (url) => downloadService.getDownloadProgress(url),
    cancelDownload: (url) => downloadService.cancelDownload(url),
    getDownloadStats: () => downloadService.getDownloadStats(),
    getSupportedPlatforms: () => downloadService.getSupportedPlatforms(),
    generateDownloadReport: () => downloadService.generateDownloadReport(),
    isValidUrl: (url) => downloadService.isValidUrl(url),
    clearCache: () => downloadService.clearCache()
};