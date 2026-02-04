import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import font from '../../utils/font.js';

const execAsync = promisify(exec);

const SETTABLE_KEYS = {
    PREFIX: { type: 'string', default: '.', description: 'Command prefix' },
    BOT_NAME: { type: 'string', default: 'WhatsApp Bot', description: 'Bot display name' },
    OWNER_NUMBER: { type: 'string', default: '', description: 'Owner phone number' },
    AUTO_READ: { type: 'boolean', default: 'false', description: 'Auto read messages' },
    AUTO_TYPING: { type: 'boolean', default: 'false', description: 'Show typing indicator' },
    AUTO_RECORDING: { type: 'boolean', default: 'false', description: 'Show recording indicator' },
    SELF_MODE: { type: 'boolean', default: 'false', description: 'Self bot mode' },
    PUBLIC_MODE: { type: 'boolean', default: 'true', description: 'Public bot access' },
    ANTI_CALL: { type: 'boolean', default: 'false', description: 'Block voice calls' },
    ANTI_DELETE: { type: 'boolean', default: 'false', description: 'Save deleted messages' },
    WELCOME_MESSAGE: { type: 'boolean', default: 'true', description: 'Send welcome messages' },
    GOODBYE_MESSAGE: { type: 'boolean', default: 'true', description: 'Send goodbye messages' },
    WORK_TYPE: { type: 'enum', values: ['public', 'private', 'self'], default: 'public', description: 'Bot work mode' },
    TIME_ZONE: { type: 'string', default: 'Africa/Lagos', description: 'Bot timezone' },
    LANGUAGE: { type: 'string', default: 'en', description: 'Bot language' }
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
    usage: 'settings [key] [value]\nsettings reset\nsettings commit <message>',
    example: 'settings\nsettings PREFIX !\nsettings AUTO_READ true\nsettings commit "Updated prefix"',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, sender }) {
        if (args.length === 0) {
            const env = readEnv();
            let msg = `${font.boldScript('Bot Configuration')}\n\n`;

            Object.entries(SETTABLE_KEYS).forEach(([key, meta]) => {
                const current = env[key] || meta.default;
                msg += `${font.monospace(key)}\n`;
                msg += `  ${font.italic(current)}\n`;
                msg += `  ${meta.description}\n\n`;
            });

            msg += `\n${font.sans('Usage:')}\n`;
            msg += `settings <key> <value>\n`;
            msg += `settings reset\n`;
            msg += `settings commit "<message>"`;

            return await sock.sendMessage(from, { text: msg }, { quoted: message });
        }

        const action = args[0].toUpperCase();

        if (action === 'RESET') {
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

        if (action === 'COMMIT') {
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

        if (!SETTABLE_KEYS[action]) {
            return await sock.sendMessage(from, {
                text: `${font.bold('Unknown Setting')}\n\n${font.italic(action)} is not a valid setting key.\n\nUse ${font.monospace('settings')} to see all available keys.`
            }, { quoted: message });
        }

        if (args.length < 2) {
            const meta = SETTABLE_KEYS[action];
            const env = readEnv();
            const current = env[action] || meta.default;

            let msg = `${font.bold(action)}\n\n`;
            msg += `${font.italic('Current:')} ${current}\n`;
            msg += `${font.italic('Default:')} ${meta.default}\n`;
            msg += `${font.italic('Type:')} ${meta.type}\n`;

            if (meta.values) {
                msg += `${font.italic('Valid:')} ${meta.values.join(', ')}\n`;
            }

            msg += `\n${font.sans(meta.description)}`;

            return await sock.sendMessage(from, { text: msg }, { quoted: message });
        }

        const value = args.slice(1).join(' ');
        const meta = SETTABLE_KEYS[action];

        if (meta.type === 'boolean') {
            if (!['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase())) {
                return await sock.sendMessage(from, {
                    text: `${font.bold('Invalid Value')}\n\n${action} requires: true/false`
                }, { quoted: message });
            }
        }

        if (meta.type === 'enum' && !meta.values.includes(value.toLowerCase())) {
            return await sock.sendMessage(from, {
                text: `${font.bold('Invalid Value')}\n\n${action} must be one of: ${meta.values.join(', ')}`
            }, { quoted: message });
        }

        const env = readEnv();
        const oldValue = env[action] || meta.default;
        env[action] = value;
        writeEnv(env);

        const gitResult = await gitCommit(`Updated ${action}: ${oldValue} → ${value}`);
        const environment = await detectEnvironment();

        let msg = `${font.sansBold('Setting Updated')}\n\n`;
        msg += `${font.monospace(action)}\n`;
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