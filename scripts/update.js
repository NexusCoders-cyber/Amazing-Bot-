import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const isReplit = process.env.REPL_ID || process.env.REPLIT_DB_URL;
const isGitAvailable = !isReplit;

async function update() {
    try {
        console.log('🔄 Ilom WhatsApp Bot - Update Script');
        console.log('====================================\n');

        if (isGitAvailable) {
            try {
                console.log('📥 Fetching latest changes from repository...');
                execSync('git fetch origin', { stdio: 'inherit', cwd: rootDir });

                const currentBranch = execSync('git branch --show-current', { 
                    cwd: rootDir,
                    encoding: 'utf8' 
                }).trim();
                console.log(`Current branch: ${currentBranch}\n`);

                const hasChanges = execSync('git status --porcelain', { 
                    cwd: rootDir,
                    encoding: 'utf8' 
                }).trim();

                if (hasChanges) {
                    console.log('⚠️  You have uncommitted changes!');
                    console.log('Creating backup before update...\n');
                    
                    if (process.platform === 'win32') {
                        execSync('node scripts/backup.js', { stdio: 'inherit', cwd: rootDir });
                    } else {
                        execSync('bash scripts/backup.sh', { stdio: 'inherit', cwd: rootDir });
                    }
                    
                    console.log('\n⚠️  Stashing uncommitted changes...');
                    execSync(`git stash push -m "Auto-stash before update ${new Date().toISOString()}"`, { 
                        stdio: 'inherit', 
                        cwd: rootDir 
                    });
                }

                console.log('⬇️  Pulling latest changes...');
                execSync(`git pull origin ${currentBranch}`, { stdio: 'inherit', cwd: rootDir });
            } catch (error) {
                console.log('⚠️  Git operations failed, continuing with dependency update only...\n');
            }
        } else {
            console.log('ℹ️  Running in Replit/managed environment - skipping git operations\n');
        }

        console.log('📦 Updating dependencies...');
        
        let packageManager = 'npm';
        
        if (!isReplit) {
            try {
                execSync('pnpm --version', { stdio: 'ignore' });
                packageManager = 'pnpm';
            } catch {
                try {
                    execSync('yarn --version', { stdio: 'ignore' });
                    packageManager = 'yarn';
                } catch {}
            }
        }

        console.log(`Using ${packageManager}...`);
        execSync(`${packageManager} install`, { stdio: 'inherit', cwd: rootDir });

        console.log('\n✅ Update completed successfully!\n');
        console.log('📋 Next steps:');
        if (isGitAvailable) {
            console.log('1. Review CHANGELOG.md for breaking changes');
            console.log('2. Update your .env if needed');
            console.log('3. Restart the bot: npm start');
        } else {
            console.log('1. Update your .env if needed');
            console.log('2. Restart the bot: npm start');
            console.log('\nℹ️  For code updates in Replit, pull from GitHub manually');
        }

    } catch (error) {
        console.error('❌ Update failed:', error.message);
        process.exit(1);
    }
}

update();
