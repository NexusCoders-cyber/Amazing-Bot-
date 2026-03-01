import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from '../utils/logger.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MediaHandler {
    constructor() {
        this.mediaDir = path.join(process.cwd(), 'media');
        this.tempDir = path.join(process.cwd(), 'temp');
        this.downloadDir = path.join(this.mediaDir, 'downloads');
        this.uploadDir = path.join(this.mediaDir, 'uploads');
        this.cacheDir = path.join(this.mediaDir, 'cache');
        
        this.supportedFormats = {
            image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
            video: ['.mp4', '.avi', '.mkv', '.mov', '.webm', '.flv'],
            audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
            document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt']
        };
        
        this.maxFileSize = config.limits?.mediaSize || 50 * 1024 * 1024;
    }

    async initialize() {
        try {
            await fs.ensureDir(this.mediaDir);
            await fs.ensureDir(this.tempDir);
            await fs.ensureDir(this.downloadDir);
            await fs.ensureDir(this.uploadDir);
            await fs.ensureDir(this.cacheDir);
            
            logger.info('Media handler initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize media handler:', error);
            throw error;
        }
    }

    async downloadMedia(message, mediaType = 'buffer') {
        try {
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(message, mediaType, {});
            
            if (!buffer || buffer.length === 0) {
                throw new Error('Downloaded media is empty');
            }
            
            return buffer;
        } catch (error) {
            logger.error('Failed to download media:', error);
            throw error;
        }
    }

    async saveMedia(buffer, filename, type = 'download') {
        try {
            const targetDir = type === 'download' ? this.downloadDir : 
                            type === 'upload' ? this.uploadDir : this.cacheDir;
            
            const filePath = path.join(targetDir, filename);
            await fs.writeFile(filePath, buffer);
            
            logger.debug(`Media saved: ${filename} (${buffer.length} bytes)`);
            
            return {
                path: filePath,
                filename,
                size: buffer.length,
                type
            };
        } catch (error) {
            logger.error('Failed to save media:', error);
            throw error;
        }
    }

    async processImageMessage(message) {
        try {
            const media = message.message?.imageMessage;
            if (!media) return null;
            
            const buffer = await this.downloadMedia(message);
            const extension = media.mimetype?.split('/')[1] || 'jpg';
            const filename = `image_${Date.now()}.${extension}`;
            
            const savedMedia = await this.saveMedia(buffer, filename, 'download');
            
            return {
                ...savedMedia,
                mimetype: media.mimetype,
                caption: media.caption || null,
                width: media.width,
                height: media.height
            };
        } catch (error) {
            logger.error('Failed to process image message:', error);
            return null;
        }
    }

    async processVideoMessage(message) {
        try {
            const media = message.message?.videoMessage;
            if (!media) return null;
            
            const buffer = await this.downloadMedia(message);
            const extension = media.mimetype?.split('/')[1] || 'mp4';
            const filename = `video_${Date.now()}.${extension}`;
            
            const savedMedia = await this.saveMedia(buffer, filename, 'download');
            
            return {
                ...savedMedia,
                mimetype: media.mimetype,
                caption: media.caption || null,
                duration: media.seconds,
                width: media.width,
                height: media.height
            };
        } catch (error) {
            logger.error('Failed to process video message:', error);
            return null;
        }
    }

    async processAudioMessage(message) {
        try {
            const media = message.message?.audioMessage;
            if (!media) return null;
            
            const buffer = await this.downloadMedia(message);
            const extension = media.mimetype?.split('/')[1] || 'mp3';
            const filename = `audio_${Date.now()}.${extension}`;
            
            const savedMedia = await this.saveMedia(buffer, filename, 'download');
            
            return {
                ...savedMedia,
                mimetype: media.mimetype,
                duration: media.seconds,
                ptt: media.ptt || false
            };
        } catch (error) {
            logger.error('Failed to process audio message:', error);
            return null;
        }
    }

    async processDocumentMessage(message) {
        try {
            const media = message.message?.documentMessage;
            if (!media) return null;
            
            const buffer = await this.downloadMedia(message);
            const filename = media.fileName || `document_${Date.now()}`;
            
            const savedMedia = await this.saveMedia(buffer, filename, 'download');
            
            return {
                ...savedMedia,
                mimetype: media.mimetype,
                title: media.title,
                pageCount: media.pageCount
            };
        } catch (error) {
            logger.error('Failed to process document message:', error);
            return null;
        }
    }

    async processStickerMessage(message) {
        try {
            const media = message.message?.stickerMessage;
            if (!media) return null;
            
            const buffer = await this.downloadMedia(message);
            const filename = `sticker_${Date.now()}.webp`;
            
            const savedMedia = await this.saveMedia(buffer, filename, 'download');
            
            return {
                ...savedMedia,
                mimetype: media.mimetype,
                animated: media.isAnimated || false,
                width: media.width,
                height: media.height
            };
        } catch (error) {
            logger.error('Failed to process sticker message:', error);
            return null;
        }
    }

    async validateMedia(buffer, type) {
        try {
            if (!buffer || buffer.length === 0) {
                return { valid: false, error: 'Empty media buffer' };
            }
            
            if (buffer.length > this.maxFileSize) {
                return { 
                    valid: false, 
                    error: `File size exceeds maximum (${Math.round(this.maxFileSize / 1024 / 1024)}MB)` 
                };
            }
            
            return { valid: true };
        } catch (error) {
            logger.error('Media validation error:', error);
            return { valid: false, error: error.message };
        }
    }

    async cleanup(olderThanDays = 7) {
        try {
            const directories = [this.downloadDir, this.uploadDir, this.cacheDir, this.tempDir];
            let cleanedCount = 0;
            const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
            
            for (const dir of directories) {
                if (await fs.pathExists(dir)) {
                    const files = await fs.readdir(dir);
                    
                    for (const file of files) {
                        const filePath = path.join(dir, file);
                        const stats = await fs.stat(filePath);
                        
                        if (stats.mtime.getTime() < cutoffTime) {
                            await fs.remove(filePath);
                            cleanedCount++;
                        }
                    }
                }
            }
            
            logger.info(`Media cleanup completed: ${cleanedCount} files removed`);
            return cleanedCount;
        } catch (error) {
            logger.error('Media cleanup failed:', error);
            return 0;
        }
    }

    async getMediaStats() {
        try {
            const stats = {
                downloads: await this.getDirectoryStats(this.downloadDir),
                uploads: await this.getDirectoryStats(this.uploadDir),
                cache: await this.getDirectoryStats(this.cacheDir),
                temp: await this.getDirectoryStats(this.tempDir)
            };
            
            stats.total = {
                files: stats.downloads.files + stats.uploads.files + stats.cache.files + stats.temp.files,
                size: stats.downloads.size + stats.uploads.size + stats.cache.size + stats.temp.size
            };
            
            return stats;
        } catch (error) {
            logger.error('Failed to get media stats:', error);
            return null;
        }
    }

    async getDirectoryStats(dirPath) {
        try {
            if (!await fs.pathExists(dirPath)) {
                return { files: 0, size: 0 };
            }
            
            const files = await fs.readdir(dirPath);
            let totalSize = 0;
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                }
            }
            
            return {
                files: files.length,
                size: totalSize
            };
        } catch (error) {
            return { files: 0, size: 0 };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getMediaType(mimetype) {
        if (!mimetype) return 'unknown';
        
        const type = mimetype.split('/')[0];
        switch (type) {
            case 'image': return 'image';
            case 'video': return 'video';
            case 'audio': return 'audio';
            default: return 'document';
        }
    }

    isValidFormat(filename, type) {
        const ext = path.extname(filename).toLowerCase();
        const formats = this.supportedFormats[type] || [];
        return formats.includes(ext);
    }
}

const mediaHandler = new MediaHandler();

export default mediaHandler;

export {
    mediaHandler
};