import { exec } from 'child_process';
import { promisify } from 'util';
import config from '../../config.js';

const execPromise = promisify(exec);

export default {
    name: 'restart',
    aliases: ['reboot', 'reload'],
    category: 'owner',
    description: 'Restart the bot (works on all platforms)',
    usage: 'restart [reason]',
    example: 'restart updating features',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const reason = args.join(' ') || 'Manual restart by owner';
            const uptime = process.uptime();
            const userId = sender.split('@')[0];
            
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            
            const platform = detectPlatform();
            
            const initialMessage = `╭──⦿【 🔄 RESTARTING BOT 】
│
│ 👤 𝗜𝗻𝗶𝘁𝗶𝗮𝘁𝗲𝗱 𝗕𝘆: @${userId}
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${reason}
│ ⏰ 𝗨𝗽𝘁𝗶𝗺𝗲: ${uptimeString}
│ 🖥️ 𝗣𝗹𝗮𝘁𝗳𝗼𝗿𝗺: ${platform}
│ 🔄 𝗦𝘁𝗮𝘁𝘂𝘀: Restarting...
│
│ ⏳ Bot will be back in 10-30 seconds
│
╰────────────⦿

💫 | [ ${config.botName} 🍀 ]`;
            
            await sock.sendMessage(from, {
                text: initialMessage,
                mentions: [sender]
            }, { quoted: message });
            
            console.log(`[RESTART] Initiated by ${userId} on ${platform} - Reason: ${reason}`);
            
            await performRestart(platform);
            
        } catch (error) {
            console.error('Restart command error:', error);
            
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ RESTART FAILED 】
│
│ 🚨 𝗘𝗿𝗿𝗼𝗿: ${error.message}
│
│ 💡 𝗧𝗿𝘆𝗶𝗻𝗴 𝗳𝗼𝗿𝗰𝗲 𝗿𝗲𝘀𝘁𝗮𝗿𝘁...
│
╰────────────⦿`
            }, { quoted: message });
            
            setTimeout(() => {
                console.log('[RESTART] Force restart - process exit');
                process.exit(1);
            }, 2000);
        }
    }
};

function detectPlatform() {
    if (process.env.DYNO) return 'Heroku';
    if (process.env.KOYEB_PUBLIC_DOMAIN) return 'Koyeb';
    if (process.env.RENDER) return 'Render';
    if (process.env.RAILWAY_ENVIRONMENT) return 'Railway';
    if (process.env.REPL_ID || process.env.REPLIT_DB_URL) return 'Replit';
    if (process.env.CODESPACE_NAME) return 'GitHub Codespaces';
    if (process.env.PANEL_VERSION || process.env.PTERODACTYL) return 'Panel';
    if (process.env.PM2_HOME || process.env.pm_id) return 'PM2';
    if (process.env.KUBERNETES_SERVICE_HOST) return 'Kubernetes';
    if (process.env.VERCEL) return 'Vercel';
    if (process.env.NETLIFY) return 'Netlify';
    if (process.env.FLY_APP_NAME) return 'Fly.io';
    return 'VPS/Local';
}

async function performRestart(platform) {
    const restartStrategies = {
        'Heroku': async () => {
            setTimeout(() => process.exit(0), 2000);
        },
        
        'Koyeb': async () => {
            setTimeout(() => process.exit(0), 2000);
        },
        
        'Render': async () => {
            setTimeout(() => process.exit(0), 2000);
        },
        
        'Railway': async () => {
            setTimeout(() => process.exit(0), 2000);
        },
        
        'Replit': async () => {
            setTimeout(() => process.exit(0), 2000);
        },
        
        'GitHub Codespaces': async () => {
            setTimeout(() => process.exit(0), 2000);
        },
        
        'Panel': async () => {
            try {
                await execPromise('pm2 restart 0');
                console.log('[RESTART] PM2 restart successful');
            } catch (pm2Error) {
                console.log('[RESTART] PM2 not found, using process exit');
                setTimeout(() => process.exit(0), 2000);
            }
        },
        
        'PM2': async () => {
            try {
                const pm2Id = process.env.pm_id || '0';
                await execPromise(`pm2 restart ${pm2Id}`);
                console.log('[RESTART] PM2 restart successful');
            } catch (error) {
                try {
                    await execPromise('pm2 restart all');
                    console.log('[RESTART] PM2 restart all successful');
                } catch (allError) {
                    console.log('[RESTART] PM2 failed, using process exit');
                    setTimeout(() => process.exit(0), 2000);
                }
            }
        },
        
        'Kubernetes': async () => {
            setTimeout(() => process.exit(0), 2000);
        },
        
        'Vercel': async () => {
            console.log('[RESTART] Vercel detected - serverless platform');
            setTimeout(() => process.exit(0), 2000);
        },
        
        'Netlify': async () => {
            console.log('[RESTART] Netlify detected - serverless platform');
            setTimeout(() => process.exit(0), 2000);
        },
        
        'Fly.io': async () => {
            setTimeout(() => process.exit(0), 2000);
        },
        
        'VPS/Local': async () => {
            try {
                await execPromise('pm2 restart 0');
                console.log('[RESTART] PM2 restart successful');
            } catch (pm2Error) {
                try {
                    await execPromise('pm2 restart all');
                    console.log('[RESTART] PM2 restart all successful');
                } catch (allError) {
                    console.log('[RESTART] No PM2, checking for systemd');
                    try {
                        await execPromise('systemctl --user restart whatsapp-bot');
                        console.log('[RESTART] Systemd restart successful');
                    } catch (systemdError) {
                        console.log('[RESTART] Using process exit');
                        setTimeout(() => process.exit(0), 2000);
                    }
                }
            }
        }
    };
    
    const restartFunction = restartStrategies[platform] || restartStrategies['VPS/Local'];
    await restartFunction();
}