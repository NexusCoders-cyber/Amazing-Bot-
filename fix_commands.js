import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixCommandFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');

        // Skip if already properly formatted
        if (content.includes('export default') && !content.includes('require(') && !content.includes('.promises;') && !content.includes('?.version')) {
            return false;
        }

        let fixed = content;

        // Fix broken import statements
        fixed = fixed.replace(/import\s+\w+\s+from\s+['"][^'"]+\.json\.js['"];?/g, (match) => {
            // Skip these for now - will handle package.json separately
            return match;
        });

        // Remove broken .promises; lines
        fixed = fixed.replace(/^\s*\.promises;\s*$/gm, '');

        // Remove dangling optional chaining
        fixed = fixed.replace(/^\s*\?\.version\s*\|\|\s*['"]Unknown['"];\s*$/gm, '');

        // Fix malformed import statements
        fixed = fixed.replace(/import\s+currentVersion\s+from\s+['"][^'"]*package\.json\.js['"];?/g, '');
        fixed = fixed.replace(/import\s+newVersion\s+from\s+['"][^'"]*package\.json\.js['"];?/g, '');

        // Add proper imports for package.json access
        if (fixed.includes('currentVersion') || fixed.includes('newVersion')) {
            const importStatement = `import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
const currentVersion = packageJson.version || 'Unknown';
const newVersion = packageJson.version || 'Unknown';
`;

            // Add imports after existing imports
            const importMatch = fixed.match(/^import.*$/gm);
            if (importMatch) {
                const lastImportIndex = fixed.lastIndexOf(importMatch[importMatch.length - 1]) + importMatch[importMatch.length - 1].length;
                fixed = fixed.slice(0, lastImportIndex) + '\n\n' + importStatement + '\n' + fixed.slice(lastImportIndex);
            }
        }

        // Clean up extra newlines
        fixed = fixed.replace(/\n{3,}/g, '\n\n');

        // Remove empty lines at the beginning
        fixed = fixed.replace(/^\s*\n+/, '');

        await fs.writeFile(filePath, fixed, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error fixing ${filePath}:`, error.message);
        return false;
    }
}

async function fixAllCommands() {
    const commandsDir = path.join(__dirname, 'src', 'commands');

    try {
        const categories = await fs.readdir(commandsDir);

        for (const category of categories) {
            const categoryPath = path.join(commandsDir, category);

            if (!(await fs.stat(categoryPath)).isDirectory()) continue;

            const commandFiles = (await fs.readdir(categoryPath))
                .filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                const fixed = await fixCommandFile(filePath);

                if (fixed) {
                    console.log(`✅ Fixed: ${category}/${file}`);
                } else {
                    console.log(`⏭️  Skipped: ${category}/${file} (already fixed)`);
                }
            }
        }

        console.log('\n🎉 Command fixing completed!');
    } catch (error) {
        console.error('Error during fixing:', error);
    }
}

fixAllCommands();