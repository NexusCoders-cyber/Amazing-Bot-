import fs from 'fs';
import path from 'path';

export const VALID_EXTENSIONS = [
    'js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rb', 'php',
    'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash', 'md',
    'txt', 'sql', 'swift', 'kt', 'rs', 'lua', 'dart', 'env'
];

export function getGitHubPat() {
    return (
        process.env.GH_PAT
        || process.env.GITHUB_TOKEN
        || process.env.GITHUB_PAT
        || process.env.GH_TOKEN
        || ''
    ).trim();
}

export function maskToken(token = '') {
    if (!token) return '';
    if (token.length <= 8) return `${token.slice(0, 2)}••••${token.slice(-2)}`;
    return `${token.slice(0, 4)}••••••••••••••••${token.slice(-4)}`;
}

export function parseInput(input) {
    const text = String(input || '').trim();
    if (text.includes('|')) {
        const separatorIndex = text.indexOf('|');
        const possibleName = text.slice(0, separatorIndex).trim();
        const content = text.slice(separatorIndex + 1).trim();
        const hasExt = possibleName.includes('.') && possibleName.length > 2;
        if (hasExt && content.length > 0) return { filename: possibleName, content };
    }

    const lines = text.split('\n');
    const firstLine = (lines[0] || '').trim();
    const hintMatch = firstLine.match(/^(?:\/\/|#)\s*\.(\w+)$/);
    if (hintMatch && VALID_EXTENSIONS.includes(hintMatch[1])) {
        const ext = hintMatch[1];
        const content = lines.slice(1).join('\n').trim();
        return { filename: `snippet.${ext}`, content: content.length > 0 ? content : text };
    }

    return { filename: 'snippet.txt', content: text };
}

export function parseEditInput(input) {
    const text = String(input || '').trim();
    const idx = text.indexOf('|');
    if (idx === -1) return null;

    const left = text.slice(0, idx).trim();
    const content = text.slice(idx + 1).trim();
    if (!left || !content) return null;

    const parts = left.split(/\s+/).filter(Boolean);
    const gistRaw = parts[0];
    const maybeFile = parts[1] || null;
    const filename = maybeFile && maybeFile.includes('.') ? maybeFile : null;

    return { gistRaw, filename, content };
}

export function getLang(filename) {
    const ext = String(filename || '').split('.').pop();
    const map = {
        js: 'JavaScript', ts: 'TypeScript', py: 'Python', java: 'Java',
        c: 'C', cpp: 'C++', cs: 'C#', go: 'Go', rb: 'Ruby', php: 'PHP',
        html: 'HTML', css: 'CSS', json: 'JSON', xml: 'XML', yaml: 'YAML',
        yml: 'YAML', sh: 'Shell', bash: 'Bash', md: 'Markdown', txt: 'Text',
        sql: 'SQL', swift: 'Swift', kt: 'Kotlin', rs: 'Rust', lua: 'Lua',
        dart: 'Dart', env: 'Environment'
    };
    return map[ext] || 'Text';
}

export function extractGistId(input) {
    const trimmed = String(input || '').trim();
    if (!trimmed) return '';

    const noQuery = trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '');
    const hashMatch = noQuery.match(/[a-f0-9]{20,}/i);
    if (hashMatch) return hashMatch[0];

    if (noQuery.includes('gist.github.com') || noQuery.includes('gist.githubusercontent.com')) {
        const parts = noQuery.split('/').filter(Boolean);
        return parts[parts.length - 1] || '';
    }

    return noQuery;
}

export async function ghFetch(apiPath, token, options = {}) {
    return fetch(`https://api.github.com${apiPath}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
}

function quoteIfNeeded(value) {
    if (/\s|#/.test(value)) return `"${value.replace(/"/g, '\\"')}"`;
    return value;
}

export function upsertEnvVar(key, value) {
    const envPath = path.join(process.cwd(), '.env');
    const nextLine = `${key}=${quoteIfNeeded(String(value || '').trim())}`;

    if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, `${nextLine}\n`, 'utf8');
        process.env[key] = String(value || '').trim();
        return;
    }

    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    let replaced = false;
    const updated = lines.map((line) => {
        if (/^\s*#/.test(line) || !line.includes('=')) return line;
        const idx = line.indexOf('=');
        const existingKey = line.slice(0, idx).trim();
        if (existingKey !== key) return line;
        replaced = true;
        return nextLine;
    });

    if (!replaced) updated.push(nextLine);
    fs.writeFileSync(envPath, `${updated.join('\n').replace(/\n*$/, '\n')}`, 'utf8');
    process.env[key] = String(value || '').trim();
}
