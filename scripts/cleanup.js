import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const cleanupDirs = [
    'temp/downloads',
    'temp/uploads',
    'temp/stickers',
    'temp/audio',
    'temp/video',
    'temp/documents',
    'logs',
    'media/cache'
];

const safetyCheck = [
    'src',
    'node_modules',
    'session',
    'backups'
];

async function cleanup() {
    console.log('🧹 Starting cleanup process...\n');
    
    let totalSize = 0;
    let totalFiles = 0;

    for (const dir of cleanupDirs) {
        const fullPath = path.join(rootDir, dir);
        
        if (await fs.pathExists(fullPath)) {
            const files = await fs.readdir(fullPath);
            
            for (const file of files) {
                const filePath = path.join(fullPath, file);
                const stats = await fs.stat(filePath);
                
                if (stats.isFile()) {
                    totalSize += stats.size;
                    totalFiles++;
                    await fs.remove(filePath);
                }
            }
            
            console.log(`✅ Cleaned: ${dir} (${files.length} items)`);
        } else {
            await fs.ensureDir(fullPath);
            console.log(`📁 Created: ${dir}`);
        }
    }

    const cachePath = path.join(rootDir, 'cache');
    if (await fs.pathExists(cachePath)) {
        const cacheFiles = await fs.readdir(cachePath);
        const tempCacheFiles = cacheFiles.filter(f => !f.includes('auth_info_baileys'));
        
        for (const file of tempCacheFiles) {
            const filePath = path.join(cachePath, file);
            if ((await fs.stat(filePath)).isFile()) {
                await fs.remove(filePath);
                totalFiles++;
            }
        }
        
        if (tempCacheFiles.length > 0) {
            console.log(`✅ Cleaned cache (preserved session): ${tempCacheFiles.length} items`);
        }
    }

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Files removed: ${totalFiles}`);
    console.log(`   Space freed: ${sizeInMB} MB`);
    console.log('\n✨ Cleanup completed successfully!');
}

cleanup().catch(error => {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
});
