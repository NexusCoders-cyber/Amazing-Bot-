import { createCanvas } from '@napi-rs/canvas';
import os from 'os';
import fs from 'fs-extra';
import config from '../../config.js';

export default {
    name: 'monitor',
    aliases: ['sysmon', 'status', 'systemstatus'],
    category: 'owner',
    description: 'Display detailed system performance metrics',
    usage: 'monitor',
    example: 'monitor',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, from, sender }) {
        try {
            const statusMsg = await sock.sendMessage(from, {
                text: '⚡ Generating system monitor...'
            }, { quoted: message });

            const botUptime = process.uptime();
            const systemUptime = os.uptime();
            const memUsage = process.memoryUsage();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const cpus = os.cpus();
            const platform = os.platform();
            const arch = os.arch();
            const hostname = os.hostname();

            let diskUsage = { total: 15.64 * 1024 * 1024 * 1024, used: 6.22 * 1024 * 1024 * 1024, free: 8.61 * 1024 * 1024 * 1024 };
            try {
                const stats = await fs.statfs(process.cwd());
                diskUsage.total = stats.blocks * stats.bsize;
                diskUsage.free = stats.bfree * stats.bsize;
                diskUsage.used = diskUsage.total - diskUsage.free;
            } catch (e) {}

            const formatBytes = (bytes) => {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };

            const formatUptime = (seconds) => {
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                
                if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
                if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
                if (minutes > 0) return `${minutes}m ${secs}s`;
                return `${secs}s`;
            };

            const canvas = createCanvas(1200, 800);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#6B46C1');
            gradient.addColorStop(0.5, '#7C3AED');
            gradient.addColorStop(1, '#5B21B6');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;

            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ SYSTEM STATUS', 600, 70);

            ctx.font = '24px Arial';
            ctx.fillStyle = '#E0E0E0';
            ctx.fillText('Real-time Performance Dashboard', 600, 110);

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            const drawCard = (x, y, width, height, title, icon) => {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2;
                
                const radius = 15;
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + width - radius, y);
                ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                ctx.lineTo(x + width, y + height - radius);
                ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                ctx.lineTo(x + radius, y + height);
                ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.font = 'bold 20px Arial';
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'left';
                ctx.fillText(`${icon} ${title}`, x + 20, y + 35);
            };

            const drawProgressBar = (x, y, width, height, percentage, color, label, value) => {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(x, y, width, height);

                const gradientBar = ctx.createLinearGradient(x, 0, x + width, 0);
                gradientBar.addColorStop(0, color);
                gradientBar.addColorStop(1, color + 'CC');
                ctx.fillStyle = gradientBar;
                ctx.fillRect(x, y, (width * percentage) / 100, height);

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);

                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'left';
                ctx.fillText(label, x, y - 10);

                ctx.textAlign = 'right';
                ctx.fillText(value, x + width, y - 10);
            };

            const rssPercent = (memUsage.rss / totalMem) * 100;
            const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            const systemMemPercent = (usedMem / totalMem) * 100;
            const diskPercent = (diskUsage.used / diskUsage.total) * 100;

            drawCard(30, 150, 270, 120, 'Bot Uptime', '💻');
            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText(formatUptime(botUptime), 165, 215);
            ctx.font = '16px Arial';
            ctx.fillStyle = '#E0E0E0';
            ctx.fillText('System Uptime', 165, 240);
            ctx.fillText(formatUptime(systemUptime), 165, 260);

            drawCard(320, 150, 270, 120, 'Memory', '💾');
            ctx.font = '18px Arial';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.fillText(`RSS: ${formatBytes(memUsage.rss)}`, 340, 200);
            ctx.fillText(`Max: ${formatBytes(totalMem)}`, 340, 225);
            ctx.fillText(`Ext: ${formatBytes(memUsage.external)}`, 340, 250);

            drawCard(610, 150, 270, 120, 'System', '🖥️');
            ctx.fillText(`OS: ${platform}`, 630, 200);
            ctx.fillText(`Arch: ${arch}`, 630, 225);
            ctx.fillText(`Cores: ${cpus.length}`, 630, 250);

            drawCard(900, 150, 270, 120, 'Disk', '💿');
            ctx.fillText(`Total: ${formatBytes(diskUsage.total)}`, 920, 200);
            ctx.fillText(`Used: ${formatBytes(diskUsage.used)}`, 920, 225);
            ctx.fillText(`Free: ${formatBytes(diskUsage.free)}`, 920, 250);

            drawCard(30, 300, 1140, 220, 'RAM Usage', '📊');
            
            drawProgressBar(
                60, 360, 1080, 35,
                rssPercent,
                '#EF4444',
                'Bot RSS (Total Process)',
                `${formatBytes(memUsage.rss)} (${rssPercent.toFixed(2)}%)`
            );

            drawProgressBar(
                60, 420, 1080, 35,
                heapPercent,
                '#3B82F6',
                'Bot Heap (JS Only)',
                `${formatBytes(memUsage.heapUsed)} (${heapPercent.toFixed(2)}%)`
            );

            drawProgressBar(
                60, 480, 1080, 35,
                systemMemPercent,
                '#10B981',
                'System RAM',
                `${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${systemMemPercent.toFixed(2)}%)`
            );

            drawCard(30, 550, 1140, 150, 'Disk Usage', '💿');

            drawProgressBar(
                60, 610, 1080, 35,
                diskPercent,
                '#8B5CF6',
                'Disk Used',
                `${formatBytes(diskUsage.used)} / ${formatBytes(diskUsage.total)} (${diskPercent.toFixed(2)}%)`
            );

            const freePercent = ((diskUsage.free / diskUsage.total) * 100);
            drawProgressBar(
                60, 660, 1080, 35,
                freePercent,
                '#06B6D4',
                'Disk Free',
                `${formatBytes(diskUsage.free)} (${freePercent.toFixed(2)}%)`
            );

            ctx.font = '18px Arial';
            ctx.fillStyle = '#E0E0E0';
            ctx.textAlign = 'center';
            const botName = config?.botName || 'IlomBot';
            ctx.fillText(`${botName} V2 • System Monitor`, 600, 760);

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(from, {
                image: buffer,
                caption: `⚡ *SYSTEM STATUS MONITOR*\n\n📊 *Performance Metrics*\n├ Bot Uptime: ${formatUptime(botUptime)}\n├ System: ${formatUptime(systemUptime)}\n├ Memory: ${formatBytes(memUsage.rss)} / ${formatBytes(totalMem)}\n├ Disk: ${formatBytes(diskUsage.used)} / ${formatBytes(diskUsage.total)}\n├ CPU: ${cpus[0].model}\n├ Cores: ${cpus.length}\n├ Host: ${hostname}\n╰ Platform: ${platform}\n\n_Generated: ${new Date().toLocaleString()}_`
            }, { quoted: message });

            try {
                await sock.sendMessage(from, { delete: statusMsg.key });
            } catch (e) {}

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Error generating system monitor\n\n${error.message}`
            }, { quoted: message });
        }
    }
};