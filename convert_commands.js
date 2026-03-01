import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertCommandFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');

        // Skip if already converted
        if (content.includes('import ') && content.includes('export default')) {
            return false;
        }

        let converted = content;

        // Convert require statements at the top
        const requireRegex = /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g;
        const imports = [];

        converted = converted.replace(requireRegex, (match, varName, modulePath) => {
            // Convert relative paths to .js extension
            let importPath = modulePath;
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
                if (!importPath.endsWith('.js')) {
                    importPath += '.js';
                }
            }

            imports.push(`import ${varName} from '${importPath}';`);
            return '';
        });

        // Convert destructured require statements
        const destructuredRequireRegex = /const\s*\{\s*([^}]+)\s*\}\s*=\s*require\(['"]([^'"]+)['"]\);?/g;
        converted = converted.replace(destructuredRequireRegex, (match, destructured, modulePath) => {
            let importPath = modulePath;
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
                if (!importPath.endsWith('.js')) {
                    importPath += '.js';
                }
            }

            imports.push(`import { ${destructured} } from '${importPath}';`);
            return '';
        });

        // Convert module.exports to export default
        converted = converted.replace(/module\.exports\s*=\s*/, 'export default ');

        // Convert inline require statements
        const inlineRequireRegex = /require\(['"]([^'"]+)['"]\)/g;
        converted = converted.replace(inlineRequireRegex, (match, modulePath) => {
            // Handle common cases
            if (modulePath === '../../config') return 'config';
            if (modulePath === '../../constants') return 'constants';
            if (modulePath === '../../handlers/commandHandler') return 'commandHandler';
            return match; // Keep as is for now
        });

        // Add imports at the top
        if (imports.length > 0) {
            converted = imports.join('\n') + '\n\n' + converted;
        }

        // Clean up extra newlines
        converted = converted.replace(/\n{3,}/g, '\n\n');

        await fs.writeFile(filePath, converted, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error converting ${filePath}:`, error.message);
        return false;
    }
}

async function convertAllCommands() {
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
                const converted = await convertCommandFile(filePath);

                if (converted) {
                    console.log(`✅ Converted: ${category}/${file}`);
                } else {
                    console.log(`⏭️  Skipped: ${category}/${file} (already converted)`);
                }
            }
        }

        console.log('\n🎉 Command conversion completed!');
    } catch (error) {
        console.error('Error during conversion:', error);
    }
}

convertAllCommands();