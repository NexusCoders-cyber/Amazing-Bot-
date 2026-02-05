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

async function shutdownBot(environment, sock, from) {
    switch (environment) {
        case 'panel':
            await sock.sendMessage(from, {
                text: `${font.sansBold('Shutdown Initiated')}\n\n${font.italic('Environment:')} Panel\n${font.italic('Action:')} Process exit\n\n${font.circled('!')} Panel will auto-restart\nTo keep offline, stop from panel`
            });
            setTimeout(() => process.exit(0), 2000);
            break;

        case 'vps-pm2':
            try {
                await sock.sendMessage(from, {
                    text: `${font.sansBold('Shutdown Initiated')}\n\n${font.italic('Environment:')} VPS (PM2)\n${font.italic('Action:')} Stopping PM2 process\n\n${font.circled('✓')} Bot will stop`
                });
                setTimeout(async () => {
                    await execAsync('pm2 stop all');
                }, 2000);
            } catch (e) {
                await sock.sendMessage(from, {
                    text: `${font.sansBold('Shutdown Failed')}\n\n${font.circled('✗')} PM2 stop failed\nForcing exit...`
                });
                setTimeout(() => process.exit(0), 2000);
            }
            break;

        case 'vps-systemd':
            await sock.sendMessage(from, {
                text: `${font.sansBold('Shutdown Request')}\n\n${font.italic('Environment:')} VPS (systemd)\n\n${font.circled('!')} Manual action required\n\nRun: ${font.monospace('sudo systemctl stop <service>')}\n\nForcing process exit in 5s...`
            });
            setTimeout(() => process.exit(0), 5000);
            break;

        case 'codespaces':
            await sock.sendMessage(from, {
                text: `${font.sansBold('Shutdown Initiated')}\n\n${font.italic('Environment:')} GitHub Codespaces\n${font.italic('Action:')} Process exit\n\n${font.circled('✓')} Bot stopping`
            });
            setTimeout(() => process.exit(0), 2000);
            break;

        default:
            await sock.sendMessage(from, {
                text: `${font.sansBold('Shutdown Initiated')}\n\n${font.italic('Environment:')} Unknown\n${font.italic('Action:')} Force exit\n\n${font.circled('✓')} Bot shutting down`
            });
            setTimeout(() => process.exit(0), 2000);
            break;
    }
}

export default {
    name: 'shutdown',
    category: 'owner',
    description: 'Shutdown the bot gracefully',
    usage: 'shutdown',
    example: 'shutdown',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, sender }) {
        await sock.sendMessage(from, {
            react: { text: '⚠️', key: message.key }
        });

        const environment = await detectEnvironment();

        await sock.sendMessage(from, {
            text: `${font.bold('Shutdown Confirmation')}\n\n${font.italic('Detected:')} ${environment}\n\nShutting down in 3 seconds...\n\n${font.circled('!')} Send any message to cancel`
        }, { quoted: message });

        let cancelled = false;
        const cancelTimeout = setTimeout(() => {
            if (!cancelled) {
                shutdownBot(environment, sock, from);
            }
        }, 3000);

        const cleanup = () => {
            clearTimeout(cancelTimeout);
        };

        if (!global.shutdownHandlers) {
            global.shutdownHandlers = {};
        }

        global.shutdownHandlers[sender] = {
            cleanup,
            created: Date.now()
        };

        setTimeout(() => {
            if (global.shutdownHandlers[sender]) {
                delete global.shutdownHandlers[sender];
            }
        }, 10000);
    }
};
