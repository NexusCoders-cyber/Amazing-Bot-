import os from 'os';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs-extra';
import path from 'path';
import config from '../../config.js';

export default {
    name: 'uptime',
    aliases: ['up', 'runtime'],
    category: 'general',
    description: 'Check bot uptime and system information with beautiful image',
    usage: 'uptime',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender }) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const memoryUsage = process.memoryUsage();
        const totalMemory = memoryUsage.heapTotal / 1024 / 1024;
        const usedMemory = memoryUsage.heapUsed / 1024 / 1024;
        const memoryPercent = ((usedMemory / totalMemory) * 100).toFixed(1);

        const totalSystemMemory = os.totalmem() / 1024 / 1024 / 1024;
        const freeSystemMemory = os.freemem() / 1024 / 1024 / 1024;
        const usedSystemMemory = totalSystemMemory - freeSystemMemory;
        const systemMemoryPercent = ((usedSystemMemory / totalSystemMemory) * 100).toFixed(1);

        let uptimeString = '';
        if (days > 0) uptimeString += `${days}d `;
        if (hours > 0) uptimeString += `${hours}h `;
        if (minutes > 0) uptimeString += `${minutes}m `;
        uptimeString += `${seconds}s`;

        let statusText = 'Excellent';
        if (days < 1) {
            statusText = 'Recently Restarted';
        } else if (days >= 30) {
            statusText = 'Rock Solid!';
        } else if (days >= 7) {
            statusText = 'Very Stable';
        }

        try {
            const width = 1200;
            const height = 800;
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(0.5, '#764ba2');
            gradient.addColorStop(1, '#f093fb');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(40, 40, width - 80, height - 80);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.strokeRect(50, 50, width - 100, height - 100);

            let profilePic;
            try {
                const ppUrl = await sock.profilePictureUrl(sender, 'image').catch(() => null);
                if (ppUrl) {
                    profilePic = await loadImage(ppUrl);
                } else {
                    profilePic = await loadImage(config.botThumbnail).catch(() => null);
                }
            } catch {
                profilePic = null;
            }

            if (profilePic) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(180, 150, 80, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(profilePic, 100, 70, 160, 160);
                ctx.restore();

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(180, 150, 85, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 60px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(config.botName.toUpperCase(), width / 2, 160);

            ctx.font = '32px Arial';
            ctx.fillStyle = '#f0f0f0';
            ctx.fillText('SYSTEM STATUS REPORT', width / 2, 220);

            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#4ade80';
            ctx.fillText(`⏱️ ${uptimeString}`, width / 2, 300);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(`Status: ${statusText}`, width / 2, 350);

            const startY = 420;
            const lineHeight = 45;
            ctx.font = '26px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';

            const stats = [
                `💾 Memory: ${usedMemory.toFixed(1)}MB / ${totalMemory.toFixed(1)}MB (${memoryPercent}%)`,
                `🖥️ System RAM: ${usedSystemMemory.toFixed(1)}GB / ${totalSystemMemory.toFixed(1)}GB (${systemMemoryPercent}%)`,
                `🔥 CPU Cores: ${os.cpus().length}`,
                `📱 Platform: ${process.platform} (${process.arch})`,
                `⚡ Node.js: ${process.version}`,
                `🚀 Started: ${new Date(Date.now() - uptime * 1000).toLocaleString()}`
            ];

            stats.forEach((stat, index) => {
                ctx.fillText(stat, 100, startY + (index * lineHeight));
            });

            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = '#a78bfa';
            ctx.textAlign = 'center';
            ctx.fillText(`© ${config.botName} - Powered by ${config.ownerName}`, width / 2, height - 60);

            const buffer = canvas.toBuffer('image/png');
            const tempPath = path.join(process.cwd(), 'temp', `uptime_${Date.now()}.png`);
            await fs.ensureDir(path.dirname(tempPath));
            await fs.writeFile(tempPath, buffer);

            await sock.sendMessage(from, {
                image: { url: tempPath },
                caption: `⏱️ *${config.botName} Uptime Report*\n\n✨ *Status:* ${statusText}\n⏰ *Runtime:* ${uptimeString}\n\n_Type ${config.prefix}ping for response time_`
            }, { quoted: message });

            await fs.unlink(tempPath).catch(() => {});

        } catch (error) {
            const response = `⏱️ *Bot Uptime & System Status*

━━━━━━━━━━━━━━━━━━━━━

📊 *Status:* ${statusText}
⏰ *Runtime:* ${uptimeString}
🗓️ *Started:* ${new Date(Date.now() - uptime * 1000).toLocaleString()}

💾 *MEMORY USAGE:*
├ Bot: ${usedMemory.toFixed(1)}MB / ${totalMemory.toFixed(1)}MB (${memoryPercent}%)
├ System: ${usedSystemMemory.toFixed(1)}GB / ${totalSystemMemory.toFixed(1)}GB (${systemMemoryPercent}%)
╰ Free: ${freeSystemMemory.toFixed(1)}GB

🖥️ *SYSTEM INFO:*
├ Platform: ${process.platform}
├ Architecture: ${process.arch}
├ Node.js: ${process.version}
╰ CPU Cores: ${os.cpus().length}

━━━━━━━━━━━━━━━━━━━━━`;

            await sock.sendMessage(from, { text: response }, { quoted: message });
        }
    }
};
