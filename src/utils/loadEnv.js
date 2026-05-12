import fs from 'fs';
import path from 'path';

const initialProcessEnvKeys = new Set(Object.keys(process.env));

function parseEnvLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return null;

    const idx = trimmed.indexOf('=');
    if (idx === -1) return null;

    const key = trimmed.slice(0, idx).trim();
    if (!key) return null;

    let value = trimmed.slice(idx + 1).trim();
    const isQuoted = (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    );

    // Support inline comments for unquoted values:
    // KEY=value # comment
    if (!isQuoted) {
        value = value.replace(/\s+#.*$/, '').trim();
    }

    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, '\n');
    return { key, value };
}

function loadEnvFromFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
        const parsed = parseEnvLine(line);
        if (!parsed) continue;
        // Keep externally provided process env values intact.
        if (initialProcessEnvKeys.has(parsed.key)) continue;
        // First-loaded env file wins; do not allow later fallback files
        // (e.g. config/development.env defaults) to overwrite real values
        // from .env / .env.local.
        if (Object.prototype.hasOwnProperty.call(process.env, parsed.key)) continue;
        process.env[parsed.key] = parsed.value;
    }
}

function loadEnvFiles() {
    const root = process.cwd();
    const nodeEnv = String(process.env.NODE_ENV || '').trim();
    const envCandidates = [
        path.resolve(root, '.env'),
        path.resolve(root, '.env.local'),
        nodeEnv ? path.resolve(root, `.env.${nodeEnv}`) : null,
        path.resolve(root, 'config', 'development.env'),
        path.resolve(root, 'config', 'production.env'),
        path.resolve(root, 'config', 'test.env'),
        nodeEnv ? path.resolve(root, 'config', `${nodeEnv}.env`) : null
    ].filter(Boolean);

    for (const filePath of envCandidates) {
        loadEnvFromFile(filePath);
    }
}

loadEnvFiles();
