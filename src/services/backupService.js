import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import logger from '../utils/logger.js';
import { createReadStream, createWriteStream } from 'fs';

class BackupService {
    constructor() {
        this.backupDir = path.join(process.cwd(), 'backups');
        this.maxBackups = 7;
        this.backupTypes = ['full', 'database', 'session', 'media', 'logs'];
    }

    async createBackup(type = 'full', customName = null) {
        try {
            await fs.ensureDir(this.backupDir);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const backupName = customName || `backup_${type}_${timestamp}`;
            const backupPath = path.join(this.backupDir, `${backupName}.zip`);

            logger.info(`Creating ${type} backup: ${backupName}`);

            const output = createWriteStream(backupPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            return new Promise((resolve, reject) => {
                output.on('close', async () => {
                    const size = archive.pointer();
                    logger.info(`Backup created: ${backupName} (${(size / 1024 / 1024).toFixed(2)}MB)`);
                    
                    await this.cleanupOldBackups(type);
                    
                    resolve({
                        success: true,
                        name: backupName,
                        path: backupPath,
                        size: size,
                        type: type,
                        createdAt: new Date()
                    });
                });

                archive.on('error', (err) => {
                    logger.error('Backup archive error:', err);
                    reject(err);
                });

                archive.pipe(output);

                switch (type) {
                    case 'full':
                        this.addFullBackup(archive);
                        break;
                    case 'database':
                        this.addDatabaseBackup(archive);
                        break;
                    case 'session':
                        this.addSessionBackup(archive);
                        break;
                    case 'media':
                        this.addMediaBackup(archive);
                        break;
                    case 'logs':
                        this.addLogsBackup(archive);
                        break;
                    default:
                        reject(new Error(`Unknown backup type: ${type}`));
                        return;
                }

                archive.finalize();
            });
        } catch (error) {
            logger.error('Error creating backup:', error);
            throw error;
        }
    }

    addFullBackup(archive) {
        archive.directory('cache/auth_info_baileys', 'session');
        archive.directory('src', 'src');
        archive.directory('media', 'media');
        archive.directory('logs', 'logs');
        archive.file('package.json', { name: 'package.json' });
        archive.file('.env', { name: '.env' });
        archive.file('README.md', { name: 'README.md' });
    }

    addDatabaseBackup(archive) {
        archive.directory('cache/database', 'database');
    }

    addSessionBackup(archive) {
        archive.directory('cache/auth_info_baileys', 'session');
    }

    addMediaBackup(archive) {
        archive.directory('media', 'media');
    }

    addLogsBackup(archive) {
        archive.directory('logs', 'logs');
    }

    async restoreBackup(backupPath, targetDir = process.cwd()) {
        try {
            if (!await fs.pathExists(backupPath)) {
                throw new Error(`Backup file not found: ${backupPath}`);
            }

            logger.info(`Restoring backup: ${backupPath}`);

            const unzipper = await import('unzipper');
            const stream = createReadStream(backupPath)
                .pipe(unzipper.Extract({ path: targetDir }));

            return new Promise((resolve, reject) => {
                stream.on('close', () => {
                    logger.info('Backup restored successfully');
                    resolve(true);
                });

                stream.on('error', (err) => {
                    logger.error('Error restoring backup:', err);
                    reject(err);
                });
            });
        } catch (error) {
            logger.error('Error in backup restoration:', error);
            throw error;
        }
    }

    async listBackups(type = null) {
        try {
            await fs.ensureDir(this.backupDir);
            const files = await fs.readdir(this.backupDir);

            const backups = await Promise.all(
                files
                    .filter(file => file.endsWith('.zip'))
                    .filter(file => !type || file.includes(`_${type}_`))
                    .map(async file => {
                        const filePath = path.join(this.backupDir, file);
                        const stats = await fs.stat(filePath);
                        
                        return {
                            name: file,
                            path: filePath,
                            size: stats.size,
                            sizeFormatted: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                            createdAt: stats.birthtime,
                            modifiedAt: stats.mtime
                        };
                    })
            );

            return backups.sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            logger.error('Error listing backups:', error);
            return [];
        }
    }

    async deleteBackup(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);
            
            if (!await fs.pathExists(backupPath)) {
                throw new Error(`Backup not found: ${backupName}`);
            }

            await fs.remove(backupPath);
            logger.info(`Backup deleted: ${backupName}`);
            return true;
        } catch (error) {
            logger.error('Error deleting backup:', error);
            throw error;
        }
    }

    async cleanupOldBackups(type = null) {
        try {
            const backups = await this.listBackups(type);

            if (backups.length > this.maxBackups) {
                const toDelete = backups.slice(this.maxBackups);
                
                for (const backup of toDelete) {
                    await this.deleteBackup(backup.name);
                }

                logger.info(`Cleaned up ${toDelete.length} old backups`);
            }
        } catch (error) {
            logger.error('Error cleaning up old backups:', error);
        }
    }

    async getBackupInfo(backupName) {
        try {
            const backups = await this.listBackups();
            return backups.find(b => b.name === backupName);
        } catch (error) {
            logger.error('Error getting backup info:', error);
            return null;
        }
    }

    async scheduleBackup(type, interval) {
        logger.info(`Backup scheduled: ${type} every ${interval}ms`);
        
        setInterval(async () => {
            try {
                await this.createBackup(type);
            } catch (error) {
                logger.error('Scheduled backup failed:', error);
            }
        }, interval);
    }
}

const backupService = new BackupService();

export default backupService;
