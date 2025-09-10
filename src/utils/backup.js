const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');
const logger = require('./logger');
const { databaseManager } = require('./database');
const config = require('../config');

class BackupManager {
    constructor() {
        this.backupDir = path.join(process.cwd(), 'backups');
        this.maxBackups = config.backup?.maxBackups || 7;
        this.compressionLevel = 6;
        this.backupTypes = ['database', 'session', 'media', 'logs', 'config'];
    }

    async createBackup(options = {}) {
        try {
            const {
                type = 'full',
                includeMedia = config.backup?.includeMedia || false,
                compression = config.backup?.compression !== false,
                description = ''
            } = options;

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `backup_${type}_${timestamp}`;
            const backupPath = path.join(this.backupDir, backupName);

            await fs.ensureDir(backupPath);
            
            logger.info(`Starting ${type} backup: ${backupName}`);

            const backupManifest = {
                name: backupName,
                type,
                created: new Date().toISOString(),
                description,
                version: config.botVersion || '1.0.0',
                includeMedia,
                compression,
                files: []
            };

            if (type === 'full' || type === 'database') {
                await this.backupDatabase(backupPath, backupManifest);
            }

            if (type === 'full' || type === 'session') {
                await this.backupSession(backupPath, backupManifest);
            }

            if (type === 'full' || type === 'config') {
                await this.backupConfig(backupPath, backupManifest);
            }

            if (type === 'full' || type === 'logs') {
                await this.backupLogs(backupPath, backupManifest);
            }

            if ((type === 'full' || type === 'media') && includeMedia) {
                await this.backupMedia(backupPath, backupManifest);
            }

            await fs.writeJSON(path.join(backupPath, 'manifest.json'), backupManifest, { spaces: 2 });

            let finalBackupPath = backupPath;

            if (compression) {
                finalBackupPath = await this.compressBackup(backupPath, `${backupName}.zip`);
                await fs.remove(backupPath);
            }

            await this.cleanupOldBackups();

            const backupSize = await this.getDirectorySize(finalBackupPath);
            
            logger.info(`Backup completed: ${backupName} (${this.formatBytes(backupSize)})`);

            return {
                name: backupName,
                path: finalBackupPath,
                size: backupSize,
                type,
                created: backupManifest.created,
                compressed: compression
            };

        } catch (error) {
            logger.error('Backup creation failed:', error);
            throw error;
        }
    }

    async backupDatabase(backupPath, manifest) {
        try {
            logger.info('Backing up database...');
            
            const dbBackupPath = path.join(backupPath, 'database');
            await fs.ensureDir(dbBackupPath);

            const backupFile = await databaseManager.backup();
            const dbFileName = `database_${Date.now()}.json`;
            const dbFilePath = path.join(dbBackupPath, dbFileName);

            await fs.copy(backupFile, dbFilePath);
            
            manifest.files.push({
                type: 'database',
                path: `database/${dbFileName}`,
                size: (await fs.stat(dbFilePath)).size,
                created: new Date().toISOString()
            });

            logger.info('Database backup completed');
        } catch (error) {
            logger.error('Database backup failed:', error);
            throw error;
        }
    }

    async backupSession(backupPath, manifest) {
        try {
            const sessionDir = path.join(process.cwd(), 'session');
            
            if (!await fs.pathExists(sessionDir)) {
                logger.warn('Session directory not found, skipping session backup');
                return;
            }

            logger.info('Backing up session data...');
            
            const sessionBackupPath = path.join(backupPath, 'session');
            await fs.copy(sessionDir, sessionBackupPath);

            const sessionSize = await this.getDirectorySize(sessionBackupPath);
            
            manifest.files.push({
                type: 'session',
                path: 'session',
                size: sessionSize,
                created: new Date().toISOString()
            });

            logger.info('Session backup completed');
        } catch (error) {
            logger.error('Session backup failed:', error);
            throw error;
        }
    }

    async backupConfig(backupPath, manifest) {
        try {
            logger.info('Backing up configuration...');
            
            const configBackupPath = path.join(backupPath, 'config');
            await fs.ensureDir(configBackupPath);

            const configFiles = [
                '.env',
                'package.json',
                'ecosystem.config.js',
                'docker-compose.yml',
                'src/config.js',
                'src/constants.js'
            ];

            for (const configFile of configFiles) {
                const sourcePath = path.join(process.cwd(), configFile);
                
                if (await fs.pathExists(sourcePath)) {
                    const destPath = path.join(configBackupPath, path.basename(configFile));
                    await fs.copy(sourcePath, destPath);
                    
                    manifest.files.push({
                        type: 'config',
                        path: `config/${path.basename(configFile)}`,
                        size: (await fs.stat(destPath)).size,
                        created: new Date().toISOString()
                    });
                }
            }

            logger.info('Configuration backup completed');
        } catch (error) {
            logger.error('Configuration backup failed:', error);
            throw error;
        }
    }

    async backupLogs(backupPath, manifest) {
        try {
            const logsDir = path.join(process.cwd(), 'logs');
            
            if (!await fs.pathExists(logsDir)) {
                logger.warn('Logs directory not found, skipping logs backup');
                return;
            }

            logger.info('Backing up logs...');
            
            const logsBackupPath = path.join(backupPath, 'logs');
            await fs.copy(logsDir, logsBackupPath);

            const logsSize = await this.getDirectorySize(logsBackupPath);
            
            manifest.files.push({
                type: 'logs',
                path: 'logs',
                size: logsSize,
                created: new Date().toISOString()
            });

            logger.info('Logs backup completed');
        } catch (error) {
            logger.error('Logs backup failed:', error);
            throw error;
        }
    }

    async backupMedia(backupPath, manifest) {
        try {
            const mediaDir = path.join(process.cwd(), 'media');
            
            if (!await fs.pathExists(mediaDir)) {
                logger.warn('Media directory not found, skipping media backup');
                return;
            }

            logger.info('Backing up media files...');
            
            const mediaBackupPath = path.join(backupPath, 'media');
            await fs.copy(mediaDir, mediaBackupPath);

            const mediaSize = await this.getDirectorySize(mediaBackupPath);
            
            manifest.files.push({
                type: 'media',
                path: 'media',
                size: mediaSize,
                created: new Date().toISOString()
            });

            logger.info('Media backup completed');
        } catch (error) {
            logger.error('Media backup failed:', error);
            throw error;
        }
    }

    async compressBackup(backupPath, zipName) {
        return new Promise((resolve, reject) => {
            const zipPath = path.join(this.backupDir, zipName);
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: this.compressionLevel } });

            output.on('close', () => {
                logger.info(`Backup compressed: ${this.formatBytes(archive.pointer())}`);
                resolve(zipPath);
            });

            archive.on('error', reject);
            archive.pipe(output);

            archive.directory(backupPath, false);
            archive.finalize();
        });
    }

    async restoreBackup(backupPath, options = {}) {
        try {
            const {
                type = 'full',
                restoreDatabase = true,
                restoreSession = true,
                restoreConfig = false,
                restoreMedia = true,
                createBackupBeforeRestore = true
            } = options;

            logger.info(`Starting restore from: ${backupPath}`);

            if (createBackupBeforeRestore) {
                await this.createBackup({
                    type: 'full',
                    description: 'Pre-restore backup'
                });
            }

            let workingPath = backupPath;

            if (path.extname(backupPath) === '.zip') {
                workingPath = await this.extractBackup(backupPath);
            }

            const manifestPath = path.join(workingPath, 'manifest.json');
            
            if (!await fs.pathExists(manifestPath)) {
                throw new Error('Backup manifest not found');
            }

            const manifest = await fs.readJSON(manifestPath);
            logger.info(`Restoring backup: ${manifest.name} (${manifest.type})`);

            if (restoreDatabase && (type === 'full' || type === 'database')) {
                await this.restoreDatabase(workingPath, manifest);
            }

            if (restoreSession && (type === 'full' || type === 'session')) {
                await this.restoreSession(workingPath, manifest);
            }

            if (restoreConfig && (type === 'full' || type === 'config')) {
                await this.restoreConfig(workingPath, manifest);
            }

            if (restoreMedia && (type === 'full' || type === 'media')) {
                await this.restoreMedia(workingPath, manifest);
            }

            if (path.extname(backupPath) === '.zip') {
                await fs.remove(workingPath);
            }

            logger.info('Backup restore completed successfully');

            return {
                restored: true,
                manifest,
                restoredComponents: {
                    database: restoreDatabase,
                    session: restoreSession,
                    config: restoreConfig,
                    media: restoreMedia
                }
            };

        } catch (error) {
            logger.error('Backup restore failed:', error);
            throw error;
        }
    }

    async extractBackup(zipPath) {
        const extractPath = path.join(this.backupDir, 'temp_extract_' + Date.now());
        
        await fs.ensureDir(extractPath);
        
        return new Promise((resolve, reject) => {
            fs.createReadStream(zipPath)
                .pipe(unzipper.Extract({ path: extractPath }))
                .on('close', () => resolve(extractPath))
                .on('error', reject);
        });
    }

    async restoreDatabase(backupPath, manifest) {
        try {
            const dbFile = manifest.files.find(f => f.type === 'database');
            
            if (!dbFile) {
                logger.warn('No database backup found in manifest');
                return;
            }

            logger.info('Restoring database...');
            
            const dbFilePath = path.join(backupPath, dbFile.path);
            await databaseManager.restore(dbFilePath);
            
            logger.info('Database restore completed');
        } catch (error) {
            logger.error('Database restore failed:', error);
            throw error;
        }
    }

    async restoreSession(backupPath, manifest) {
        try {
            const sessionFile = manifest.files.find(f => f.type === 'session');
            
            if (!sessionFile) {
                logger.warn('No session backup found in manifest');
                return;
            }

            logger.info('Restoring session data...');
            
            const sessionBackupPath = path.join(backupPath, 'session');
            const sessionDir = path.join(process.cwd(), 'session');
            
            await fs.remove(sessionDir);
            await fs.copy(sessionBackupPath, sessionDir);
            
            logger.info('Session restore completed');
        } catch (error) {
            logger.error('Session restore failed:', error);
            throw error;
        }
    }

    async restoreConfig(backupPath, manifest) {
        try {
            const configFiles = manifest.files.filter(f => f.type === 'config');
            
            if (configFiles.length === 0) {
                logger.warn('No configuration backup found in manifest');
                return;
            }

            logger.info('Restoring configuration...');
            
            for (const configFile of configFiles) {
                const sourcePath = path.join(backupPath, configFile.path);
                const fileName = path.basename(configFile.path);
                
                let destPath;
                if (fileName.startsWith('src_')) {
                    destPath = path.join(process.cwd(), 'src', fileName.replace('src_', ''));
                } else {
                    destPath = path.join(process.cwd(), fileName);
                }
                
                await fs.copy(sourcePath, destPath);
                logger.info(`Restored config file: ${fileName}`);
            }
            
            logger.info('Configuration restore completed');
        } catch (error) {
            logger.error('Configuration restore failed:', error);
            throw error;
        }
    }

    async restoreMedia(backupPath, manifest) {
        try {
            const mediaFile = manifest.files.find(f => f.type === 'media');
            
            if (!mediaFile) {
                logger.warn('No media backup found in manifest');
                return;
            }

            logger.info('Restoring media files...');
            
            const mediaBackupPath = path.join(backupPath, 'media');
            const mediaDir = path.join(process.cwd(), 'media');
            
            await fs.remove(mediaDir);
            await fs.copy(mediaBackupPath, mediaDir);
            
            logger.info('Media restore completed');
        } catch (error) {
            logger.error('Media restore failed:', error);
            throw error;
        }
    }

    async listBackups() {
        try {
            await fs.ensureDir(this.backupDir);
            const entries = await fs.readdir(this.backupDir, { withFileTypes: true });
            
            const backups = [];
            
            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.zip')) {
                    const backupPath = path.join(this.backupDir, entry.name);
                    const stats = await fs.stat(backupPath);
                    
                    backups.push({
                        name: entry.name,
                        path: backupPath,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime,
                        compressed: true
                    });
                } else if (entry.isDirectory() && entry.name.startsWith('backup_')) {
                    const backupPath = path.join(this.backupDir, entry.name);
                    const manifestPath = path.join(backupPath, 'manifest.json');
                    
                    if (await fs.pathExists(manifestPath)) {
                        const manifest = await fs.readJSON(manifestPath);
                        const size = await this.getDirectorySize(backupPath);
                        
                        backups.push({
                            name: entry.name,
                            path: backupPath,
                            size,
                            created: new Date(manifest.created),
                            type: manifest.type,
                            description: manifest.description,
                            compressed: false
                        });
                    }
                }
            }
            
            return backups.sort((a, b) => b.created - a.created);
        } catch (error) {
            logger.error('Failed to list backups:', error);
            return [];
        }
    }

    async deleteBackup(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);
            
            if (await fs.pathExists(backupPath)) {
                await fs.remove(backupPath);
                logger.info(`Backup deleted: ${backupName}`);
                return true;
            }
            
            return false;
        } catch (error) {
            logger.error(`Failed to delete backup ${backupName}:`, error);
            return false;
        }
    }

    async cleanupOldBackups() {
        try {
            const backups = await this.listBackups();
            
            if (backups.length > this.maxBackups) {
                const backupsToDelete = backups.slice(this.maxBackups);
                
                for (const backup of backupsToDelete) {
                    await this.deleteBackup(backup.name);
                }
                
                logger.info(`Cleaned up ${backupsToDelete.length} old backups`);
            }
        } catch (error) {
            logger.error('Failed to cleanup old backups:', error);
        }
    }

    async getDirectorySize(dirPath) {
        try {
            const files = await fs.readdir(dirPath, { recursive: true, withFileTypes: true });
            let totalSize = 0;
            
            for (const file of files) {
                if (file.isFile()) {
                    const filePath = path.join(dirPath, file.name);
                    const stats = await fs.stat(filePath);
                    totalSize += stats.size;
                }
            }
            
            return totalSize;
        } catch (error) {
            return 0;
        }
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    async scheduleAutoBackup(interval = 24 * 60 * 60 * 1000) {
        const performBackup = async () => {
            try {
                await this.createBackup({
                    type: 'full',
                    description: 'Scheduled automatic backup',
                    includeMedia: config.backup?.includeMedia || false
                });
            } catch (error) {
                logger.error('Scheduled backup failed:', error);
            }
        };

        setInterval(performBackup, interval);
        
        await performBackup();
        logger.info(`Auto backup scheduled every ${this.formatBytes(interval)} milliseconds`);
    }

    generateBackupReport() {
        return this.listBackups().then(backups => {
            const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
            
            let report = `💾 *Backup System Report*\n\n`;
            report += `📊 *Statistics:*\n`;
            report += `├ Total Backups: ${backups.length}\n`;
            report += `├ Total Size: ${this.formatBytes(totalSize)}\n`;
            report += `├ Max Backups: ${this.maxBackups}\n`;
            report += `╰ Auto Cleanup: Enabled\n\n`;

            if (backups.length > 0) {
                report += `📋 *Recent Backups:*\n`;
                backups.slice(0, 5).forEach((backup, index) => {
                    const age = Math.floor((Date.now() - backup.created.getTime()) / (1000 * 60 * 60 * 24));
                    report += `${index + 1}. ${backup.name}\n`;
                    report += `   Size: ${this.formatBytes(backup.size)} | Age: ${age}d\n`;
                });
            } else {
                report += `⚠️ No backups found\n`;
            }

            return report;
        });
    }
}

const backupManager = new BackupManager();

module.exports = {
    backupManager,
    createBackup: (options) => backupManager.createBackup(options),
    restoreBackup: (backupPath, options) => backupManager.restoreBackup(backupPath, options),
    listBackups: () => backupManager.listBackups(),
    deleteBackup: (backupName) => backupManager.deleteBackup(backupName),
    cleanupOldBackups: () => backupManager.cleanupOldBackups(),
    scheduleAutoBackup: (interval) => backupManager.scheduleAutoBackup(interval),
    generateBackupReport: () => backupManager.generateBackupReport()
};