import { exec } from 'child_process';
import { promisify } from 'util';
import font from '../../utils/font.js';

const execAsync = promisify(exec);

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

async function restartBot(environment, sock, from) {
    switch (environment) {
        case 'panel':
            await sock.sendMessage(from, {
                text: `${font.sansBold('Restarting Bot')}\n\n${font.italic('Environment:')} Panel\n${font.italic('Method:')} Auto-restart\n\n${font.circled('✓')} Restarting now...`
            });
            setTimeout(() => process.exit(0), 2000);
            break;

        case 'vps-pm2':
            try {
                await sock.sendMessage(from, {
                    text: `${font.sansBold('Restarting Bot')}\n\n${font.italic('Environment:')} VPS (PM2)\n${font.italic('Method:')} PM2 restart\n\n${font.circled('✓')} Restarting...`
                });
                setTimeout(async () => {
                    await execAsync('pm2 restart all');
                }, 2000);
            } catch (e) {
                await sock.sendMessage(from, {
                    text: `${font.sansBold('Restart Failed')}\n\n${font.circled('✗')} PM2 restart failed\nForcing exit...`
                });
                setTimeout(() => process.exit(0), 2000);
            }
            break;

        case 'vps-systemd':
            await sock.sendMessage(from, {
                text: `${font.sansBold('Restart Request')}\n\n${font.italic('Environment:')} VPS (systemd)\n\n${font.circled('!')} Manual restart required\n\nRun: ${font.monospace('sudo systemctl restart <service>')}\n\nOr forcing exit in 3s...`
            });
            setTimeout(() => process.exit(0), 3000);
            break;

        case 'codespaces':
            await sock.sendMessage(from, {
                text: `${font.sansBold('Restarting Bot')}\n\n${font.italic('Environment:')} GitHub Codespaces\n${font.italic('Method:')} Process exit\n\n${font.circled('✓')} Restarting...`
            });
            setTimeout(() => process.exit(0), 2000);
            break;

        default:
            await sock.sendMessage(from, {
                text: `${font.sansBold('Restarting Bot')}\n\n${font.italic('Environment:')} Unknown\n${font.italic('Method:')} Force exit\n\n${font.circled('✓')} Restarting...`
            });
            setTimeout(() => process.exit(0), 2000);
            break;
    }
}

export default {
    name: 'restart',
    aliases: ['reboot'],
    category: 'owner',
    description: 'Restart the bot',
    usage: 'restart',
    example: 'restart',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, sender }) {
        await sock.sendMessage(from, {
            react: { text: '🔄', key: message.key }
        });

        const environment = await detectEnvironment();

        await restartBot(environment, sock, from);
    }
};
