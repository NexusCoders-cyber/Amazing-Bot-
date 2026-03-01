import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import font from '../../utils/font.js';

const execAsync = promisify(exec);

const SETTABLE_KEYS = {
    PREFIX: { type: 'string', default: '.', description: 'Command prefix', category: 'Core' },
    BOT_NAME: { type: 'string', default: 'WhatsApp Bot', description: 'Bot display name', category: 'Core' },
    OWNER_NAME: { type: 'string', default: 'Owner', description: 'Owner display name', category: 'Core' },
    OWNER_NUMBER: { type: 'string', default: '', description: 'Owner phone number', category: 'Core' },
    
    SESSION_ID: { type: 'string', default: '', description: 'Session ID', category: 'Session' },
    PAIRING_NUMBER: { type: 'string', default: '', description: 'Pairing phone number', category: 'Session' },
    MULTI_DEVICE: { type: 'boolean', default: 'true', description: 'Multi-device support', category: 'Session' },
    
    DATABASE_URL: { type: 'string', default: '', description: 'Database connection URL', category: 'Database' },
    MONGODB_URI: { type: 'string', default: '', description: 'MongoDB connection string', category: 'Database' },
    DATABASE_TYPE: { type: 'enum', values: ['mongodb', 'postgres', 'sqlite', 'none'], default: 'none', description: 'Database type', category: 'Database' },
    
    AUTO_READ: { type: 'boolean', default: 'false', description: 'Auto read messages', category: 'Behavior' },
    AUTO_TYPING: { type: 'boolean', default: 'false', description: 'Show typing indicator', category: 'Behavior' },
    AUTO_RECORDING: { type: 'boolean', default: 'false', description: 'Show recording indicator', category: 'Behavior' },
    ALWAYS_ONLINE: { type: 'boolean', default: 'false', description: 'Show always online', category: 'Behavior' },
    AUTO_STATUS_READ: { type: 'boolean', default: 'false', description: 'Auto read status updates', category: 'Behavior' },
    SEND_READ_RECEIPT: { type: 'boolean', default: 'true', description: 'Send read receipts', category: 'Behavior' },
    PRESENCE_UPDATE: { type: 'boolean', default: 'true', description: 'Update presence', category: 'Behavior' },
    
    SELF_MODE: { type: 'boolean', default: 'false', description: 'Self bot mode', category: 'Mode' },
    PUBLIC_MODE: { type: 'boolean', default: 'true', description: 'Public bot access', category: 'Mode' },
    WORK_TYPE: { type: 'enum', values: ['public', 'private', 'self'], default: 'public', description: 'Bot work mode', category: 'Mode' },
    ONLY_GROUP: { type: 'boolean', default: 'false', description: 'Group only mode', category: 'Mode' },
    ONLY_PRIVATE: { type: 'boolean', default: 'false', description: 'DM only mode', category: 'Mode' },
    
    ANTI_CALL: { type: 'boolean', default: 'false', description: 'Block voice calls', category: 'Security' },
    ANTI_DELETE: { type: 'boolean', default: 'false', description: 'Save deleted messages', category: 'Security' },
    ANTI_LINK: { type: 'boolean', default: 'false', description: 'Delete group links', category: 'Security' },
    ANTI_BOT: { type: 'boolean', default: 'false', description: 'Auto kick bots', category: 'Security' },
    ANTI_VIEWONCE: { type: 'boolean', default: 'false', description: 'Save view-once media', category: 'Security' },
    AUTO_BLOCK: { type: 'boolean', default: 'false', description: 'Auto block unknown', category: 'Security' },
    INBOX_BLOCK: { type: 'boolean', default: 'false', description: 'Block inbox messages', category: 'Security' },
    PM_BLOCK: { type: 'boolean', default: 'false', description: 'Block private messages', category: 'Security' },
    
    WELCOME_MESSAGE: { type: 'boolean', default: 'true', description: 'Send welcome messages', category: 'Group' },
    GOODBYE_MESSAGE: { type: 'boolean', default: 'true', description: 'Send goodbye messages', category: 'Group' },
    GROUP_LINK: { type: 'string', default: '', description: 'Official group link', category: 'Group' },
    
    MAX_DOWNLOAD_SIZE: { type: 'number', default: '100', description: 'Max download size (MB)', category: 'Limits' },
    COMMAND_COOLDOWN: { type: 'number', default: '3', description: 'Global cooldown (seconds)', category: 'Limits' },
    MESSAGE_LIMIT: { type: 'number', default: '10', description: 'Messages per minute', category: 'Limits' },
    FLOOD_LIMIT: { type: 'number', default: '5', description: 'Flood protection limit', category: 'Limits' },
    
    LOG_LEVEL: { type: 'enum', values: ['debug', 'info', 'warn', 'error'], default: 'info', description: 'Logging level', category: 'Logging' },
    CONSOLE_LOG: { type: 'boolean', default: 'true', description: 'Console logging', category: 'Logging' },
    FILE_LOG: { type: 'boolean', default: 'false', description: 'File logging', category: 'Logging' },
    ERROR_LOG: { type: 'boolean', default: 'true', description: 'Error logging', category: 'Logging' },
    
    AUTO_DOWNLOAD_MEDIA: { type: 'boolean', default: 'false', description: 'Auto download media', category: 'Media' },
    AUTO_STICKER: { type: 'boolean', default: 'false', description: 'Auto sticker mode', category: 'Media' },
    IMAGE_QUALITY: { type: 'enum', values: ['low', 'medium', 'high'], default: 'medium', description: 'Image quality', category: 'Media' },
    VIDEO_QUALITY: { type: 'enum', values: ['low', 'medium', 'high'], default: 'medium', description: 'Video quality', category: 'Media' },
    
    TIME_ZONE: { type: 'string', default: 'Africa/Lagos', description: 'Bot timezone', category: 'Locale' },
    LANGUAGE: { type: 'string', default: 'en', description: 'Bot language', category: 'Locale' },
    
    OPENAI_API_KEY: { type: 'string', default: '', description: 'OpenAI API key', category: 'APIs' },
    GEMINI_API_KEY: { type: 'string', default: '', description: 'Google Gemini API key', category: 'APIs' },
    CEREBRAS_API_KEY: { type: 'string', default: '', description: 'Cerebras API key', category: 'APIs' },
    REMOVE_BG_KEY: { type: 'string', default: '', description: 'Remove.bg API key', category: 'APIs' },
    WEATHER_API_KEY: { type: 'string', default: '', description: 'Weather API key', category: 'APIs' },
    SPOTIFY_CLIENT_ID: { type: 'string', default: '', description: 'Spotify client ID', category: 'APIs' },
    SPOTIFY_CLIENT_SECRET: { type: 'string', default: '', description: 'Spotify client secret', category: 'APIs' },
    
    ALIVE_MESSAGE: { type: 'string', default: 'Bot is alive!', description: 'Alive command message', category: 'Messages' },
    CAPTION: { type: 'string', default: '', description: 'Default media caption', category: 'Messages' },
    FOOTER: { type: 'string', default: '', description: 'Default footer text', category: 'Messages' },
    PACKNAME: { type: 'string', default: 'WhatsApp Bot', description: 'Sticker pack name', category: 'Messages' },
    AUTHOR: { type: 'string', default: 'Bot', description: 'Sticker author name', category: 'Messages' },
    
    SUDO_NUMBERS: { type: 'string', default: '', description: 'Sudo users (comma separated)', category: 'Advanced' },
    BLOCKED_NUMBERS: { type: 'string', default: '', description: 'Blocked numbers (comma separated)', category: 'Advanced' },
    HANDLERS: { type: 'string', default: '.!/', description: 'Command handlers', category: 'Advanced' },
    PORT: { type: 'number', default: '3000', description: 'Server port', category: 'Advanced' },
    HEROKU_API_KEY: { type: 'string', default: '', description: 'Heroku API key', category: 'Advanced' },
    HEROKU_APP_NAME: { type: 'string', default: '', description: 'Heroku app name', category: 'Advanced' }
};

function readEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return {};

    const content = fs.readFileSync(envPath, 'utf-8');
    const env = {};

    content.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;

        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) return;

        const key = line.substring(0, eqIndex).trim();
        let value = line.substring(eqIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        env[key] = value;
    });

    return env;
}

function writeEnv(envObj) {
    const envPath = path.join(process.cwd(), '.env');
    let content = '';

    if (fs.existsSync(envPath)) {
        const existing = fs.readFileSync(envPath, 'utf-8');
        const lines = existing.split('\n');
        const updated = new Set();

        lines.forEach(line => {
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith('#')) {
                content += line + '\n';
                return;
            }

            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) {
                content += line + '\n';
                return;
            }

            const key = trimmed.substring(0, eqIndex).trim();

            if (envObj.hasOwnProperty(key)) {
                const value = envObj[key];
                const needsQuotes = value.includes(' ') || value.includes('#');
                content += `${key}=${needsQuotes ? `"${value}"` : value}\n`;
                updated.add(key);
            } else {
                content += line + '\n';
            }
        });

        Object.keys(envObj).forEach(key => {
            if (!updated.has(key)) {
                const value = envObj[key];
                const needsQuotes = value.includes(' ') || value.includes('#');
                content += `${key}=${needsQuotes ? `"${value}"` : value}\n`;
            }
        });
    } else {
        Object.entries(envObj).forEach(([key, value]) => {
            const needsQuotes = value.includes(' ') || value.includes('#');
            content += `${key}=${needsQuotes ? `"${value}"` : value}\n`;
        });
    }

    fs.writeFileSync(envPath, content, 'utf-8');
}

async function gitCommit(message) {
    try {
        await execAsync('git --version');
    } catch (e) {
        return { success: false, reason: 'Git not installed' };
    }

    try {
        await execAsync('git add .env');
        await execAsync(`git commit -m "${message}"`);
        
        try {
            await execAsync('git push');
            return { success: true, pushed: true };
        } catch (pushError) {
            return { success: true, pushed: false, reason: 'Committed locally, push failed' };
        }
    } catch (error) {
        return { success: false, reason: error.message };
    }
}

async function detectEnvironment() {
    const hostname = process.env.HOSTNAME || '';
    const pwd = process.cwd();

    if (hostname.includes('bot-hosting') || pwd.includes('bot-hosting')) {
        return 'panel';
    }

    if (process.env.CODESPACES === 'true') {
        return 'codespaces';
    }

    try {
        await execAsync('pm2 --version');
        return 'vps-pm2';
    } catch (e) {}

    try {
        await execAsync('systemctl --version');
        return 'vps-systemd';
    } catch (e) {}

    return 'unknown';
}

async function restartBot(environment) {
    switch (environment) {
        case 'panel':
            setTimeout(() => process.exit(0), 2000);
            return 'Restarting via panel auto-restart...';

        case 'vps-pm2':
            try {
                await execAsync('pm2 restart all');
                return 'Restarted via PM2';
            } catch (e) {
                setTimeout(() => process.exit(0), 2000);
                return 'PM2 restart failed, forcing exit...';
            }

        case 'vps-systemd':
            return 'Please run: sudo systemctl restart <your-bot-service>';

        case 'codespaces':
            return 'Settings saved. Please restart manually.';

        default:
            setTimeout(() => process.exit(0), 2000);
            return 'Restarting bot...';
    }
}

export default {
    name: 'settings',
    aliases: ['config', 'setting', 'env'],
    category: 'owner',
    description: 'Manage bot configuration settings',
    usage: 'settings [category]\nsettings <key> <value>\nsettings reset\nsettings commit <message>',
    example: 'settings\nsettings core\nsettings PREFIX !\nsettings commit "Updated config"',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, sender }) {
        if (args.length === 0) {
            const categories = {};
            Object.entries(SETTABLE_KEYS).forEach(([key, meta]) => {
                if (!categories[meta.category]) categories[meta.category] = 0;
                categories[meta.category]++;
            });

            let msg = `${font.boldScript('Bot Configuration')}\n\n`;
            
            Object.entries(categories).forEach(([cat, count]) => {
                msg += `${font.bold(cat)}: ${count} settings\n`;
            });

            msg += `\n${font.sans('Commands:')}\n`;
            msg += `settings <category>\n`;
            msg += `settings <key> <value>\n`;
            msg += `settings reset\n`;
            msg += `settings commit "<msg>"\n\n`;

            msg += `${font.sans('Categories:')}\n`;
            msg += Object.keys(categories).map(c => font.italic(c.toLowerCase())).join(', ');

            return await sock.sendMessage(from, { text: msg }, { quoted: message });
        }

        const action = args[0].toLowerCase();

        const categories = ['core', 'session', 'database', 'behavior', 'mode', 'security', 'group', 'limits', 'logging', 'media', 'locale', 'apis', 'messages', 'advanced'];
        
        if (categories.includes(action)) {
            const env = readEnv();
            let msg = `${font.boldScript(action.toUpperCase())}\n\n`;

            Object.entries(SETTABLE_KEYS)
                .filter(([k, v]) => v.category.toLowerCase() === action)
                .forEach(([key, meta]) => {
                    const current = env[key] || meta.default;
                    msg += `${font.monospace(key)}\n`;
                    msg += `  ${font.italic(current)}\n`;
                    msg += `  ${meta.description}\n\n`;
                });

            return await sock.sendMessage(from, { text: msg }, { quoted: message });
        }

        if (action === 'reset') {
            const defaults = {};
            Object.entries(SETTABLE_KEYS).forEach(([key, meta]) => {
                defaults[key] = meta.default;
            });

            writeEnv(defaults);

            const gitResult = await gitCommit('Reset settings to defaults');
            const environment = await detectEnvironment();

            let msg = `${font.sansBold('Settings Reset')}\n\n`;
            msg += `All settings restored to defaults\n\n`;

            if (gitResult.success) {
                msg += `${font.circled('Git')}: ${gitResult.pushed ? 'Committed & Pushed' : 'Committed locally'}\n`;
            }

            msg += `${font.circled('Env')}: ${environment}\n\n`;

            const restartMsg = await restartBot(environment);
            msg += restartMsg;

            return await sock.sendMessage(from, { text: msg }, { quoted: message });
        }

        if (action === 'commit') {
            const commitMsg = args.slice(1).join(' ').replace(/"/g, '');
            if (!commitMsg) {
                return await sock.sendMessage(from, {
                    text: `${font.bold('Usage:')} settings commit "<message>"`
                }, { quoted: message });
            }

            const gitResult = await gitCommit(commitMsg);

            let msg = `${font.sansBold('Git Commit')}\n\n`;

            if (gitResult.success) {
                msg += gitResult.pushed 
                    ? `${font.circled('✓')} Committed and pushed successfully`
                    : `${font.circled('✓')} Committed locally\n${font.circled('!')} Push failed - check remote`;
            } else {
                msg += `${font.circled('✗')} Failed: ${gitResult.reason}`;
            }

            return await sock.sendMessage(from, { text: msg }, { quoted: message });
        }

        const upperAction = action.toUpperCase();

        if (!SETTABLE_KEYS[upperAction]) {
            return await sock.sendMessage(from, {
                text: `${font.bold('Unknown Setting')}\n\n${font.italic(upperAction)} is not a valid setting key.\n\nUse ${font.monospace('settings')} to see all categories.`
            }, { quoted: message });
        }

        if (args.length < 2) {
            const meta = SETTABLE_KEYS[upperAction];
            const env = readEnv();
            const current = env[upperAction] || meta.default;

            let msg = `${font.bold(upperAction)}\n\n`;
            msg += `${font.italic('Current:')} ${current}\n`;
            msg += `${font.italic('Default:')} ${meta.default}\n`;
            msg += `${font.italic('Type:')} ${meta.type}\n`;

            if (meta.values) {
                msg += `${font.italic('Valid:')} ${meta.values.join(', ')}\n`;
            }

            msg += `${font.italic('Category:')} ${meta.category}\n`;
            msg += `\n${font.sans(meta.description)}`;

            return await sock.sendMessage(from, { text: msg }, { quoted: message });
        }

        const value = args.slice(1).join(' ');
        const meta = SETTABLE_KEYS[upperAction];

        if (meta.type === 'boolean') {
            const normalized = value.toLowerCase();
            if (!['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(normalized)) {
                return await sock.sendMessage(from, {
                    text: `${font.bold('Invalid Value')}\n\n${upperAction} requires: true/false`
                }, { quoted: message });
            }
        }

        if (meta.type === 'enum' && !meta.values.includes(value.toLowerCase())) {
            return await sock.sendMessage(from, {
                text: `${font.bold('Invalid Value')}\n\n${upperAction} must be one of: ${meta.values.join(', ')}`
            }, { quoted: message });
        }

        if (meta.type === 'number' && isNaN(Number(value))) {
            return await sock.sendMessage(from, {
                text: `${font.bold('Invalid Value')}\n\n${upperAction} requires a number`
            }, { quoted: message });
        }

        const env = readEnv();
        const oldValue = env[upperAction] || meta.default;
        env[upperAction] = value;
        writeEnv(env);

        const gitResult = await gitCommit(`Updated ${upperAction}: ${oldValue} → ${value}`);
        const environment = await detectEnvironment();

        let msg = `${font.sansBold('Setting Updated')}\n\n`;
        msg += `${font.monospace(upperAction)}\n`;
        msg += `${font.strikethrough(oldValue)} → ${font.italic(value)}\n\n`;

        if (gitResult.success) {
            msg += `${font.circled('Git')}: ${gitResult.pushed ? 'Committed & Pushed' : 'Committed locally'}\n`;
        }

        msg += `${font.circled('Env')}: ${environment}\n\n`;

        const restartMsg = await restartBot(environment);
        msg += restartMsg;

        await sock.sendMessage(from, { text: msg }, { quoted: message });
    }
};
