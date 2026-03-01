import { createCanvas } from '@napi-rs/canvas';
import os from 'os';
import config from '../../config.js';

export default {
    name: 'up2',
    aliases: ['uptime2', 'systeminfo', 'sysinfo'],
    category: 'general',
    description: 'Display detailed system status and network information',
    usage: 'up2',
    example: 'up2',
    cooldown: 10,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,

    async execute({ sock, message, from, sender }) {
        try {
            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;

            const cpuUsage = process.cpuUsage();
            const cpuLoad = os.loadavg()[0];
            const cpuCores = os.cpus().length;

            const memoryPercent = ((usedMemory / totalMemory) * 100).toFixed(1);
            const usedMemoryGB = (usedMemory / (1024 ** 3)).toFixed(2);
            const totalMemoryGB = (totalMemory / (1024 ** 3)).toFixed(2);
            const freeMemoryGB = (freeMemory / (1024 ** 3)).toFixed(2);

            const platform = os.platform().toUpperCase();
            const arch = os.arch().toUpperCase();
            const hostname = os.hostname();
            const nodeVersion = process.version;

            const ping = Date.now() - message.messageTimestamp * 1000;
            const latency = Math.abs(ping) > 1000 ? '< 1000ms' : Math.abs(ping) + 'ms';

            const status = uptime > 3600 ? 'OPERATIONAL' : 'STARTING';
            const statusColor = uptime > 3600 ? '#00ff87' : '#ffaa00';

            const canvas = createCanvas(1600, 900);
            const ctx = canvas.getContext('2d');

            const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            bgGradient.addColorStop(0, '#0a0a0f');
            bgGradient.addColorStop(0.5, '#1a1a2e');
            bgGradient.addColorStop(1, '#16213e');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 200; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 2;
                const opacity = Math.random() * 0.7;
                ctx.fillStyle = `rgba(138, 43, 226, ${opacity})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            for (let i = 0; i < 5; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const radius = Math.random() * 200 + 150;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, 'rgba(138, 43, 226, 0.1)');
                gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            this.drawStatusMonitor(ctx, 60, 60, 700, 780, {
                status,
                statusColor,
                latency,
                uptime: `${days}d ${hours}h ${minutes}m ${seconds}s`,
                cpuLoad: cpuLoad.toFixed(2) + '%',
                memoryUsage: memoryPercent + '%'
            });

            this.drawSystemData(ctx, 840, 60, 700, 780, {
                nodeVersion,
                platform,
                arch,
                totalCapacity: totalMemoryGB + ' GB',
                availableRAM: freeMemoryGB + ' GB',
                usedRAM: usedMemoryGB + ' GB',
                loadAverage: cpuLoad.toFixed(2),
                hostname,
                cpuCores: cpuCores + ' CORES'
            });

            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = 'rgba(138, 43, 226, 0.6)';
            ctx.textAlign = 'center';
            ctx.fillText(`AUTHOR: ${config.botName || 'ILOM BOT'} | POWERED BY WHATSAPP BAILEYS | ALL RIGHTS RESERVED`, canvas.width / 2, canvas.height - 30);

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(from, {
                image: buffer,
                caption: `⚡ System Status Report\n\n` +
                         `📊 Status: ${status}\n` +
                         `⏰ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s\n` +
                         `💾 Memory: ${memoryPercent}% (${usedMemoryGB}GB/${totalMemoryGB}GB)\n` +
                         `🔥 CPU Load: ${cpuLoad.toFixed(2)}\n` +
                         `📡 Latency: ${latency}\n\n` +
                         `Generated: ${new Date().toLocaleString()}`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Up2 command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Failed to generate system status\n\n⚠️ ${error.message}`
            }, { quoted: message });
        }
    },

    drawStatusMonitor(ctx, x, y, width, height, data) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        this.roundRect(ctx, x, y, width, height, 30);
        ctx.fill();

        ctx.strokeStyle = 'rgba(138, 43, 226, 0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();

        const headerGradient = ctx.createLinearGradient(x, y, x + width, y);
        headerGradient.addColorStop(0, 'rgba(138, 43, 226, 0.3)');
        headerGradient.addColorStop(1, 'rgba(138, 43, 226, 0.1)');
        ctx.fillStyle = headerGradient;
        this.roundRect(ctx, x, y, width, 80, 30);
        ctx.fill();

        ctx.font = 'bold 42px Arial';
        ctx.fillStyle = '#b794f6';
        ctx.textAlign = 'left';
        ctx.fillText('STATUS MONITOR', x + 30, y + 55);

        let dataY = y + 140;

        ctx.font = '28px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('CORE STATUS', x + 30, dataY);
        dataY += 50;

        ctx.font = 'bold 56px Arial';
        ctx.fillStyle = data.statusColor;
        ctx.shadowColor = data.statusColor;
        ctx.shadowBlur = 20;
        ctx.fillText(data.status, x + 30, dataY);
        ctx.shadowBlur = 0;
        dataY += 100;

        const metrics = [
            { label: 'LATENCY (PING)', value: data.latency, color: '#00d4ff' },
            { label: 'UPTIME DURATION', value: data.uptime, color: '#ff0080' },
            { label: 'CPU LOAD', value: data.cpuLoad, color: '#ffd700' },
            { label: 'MEMORY USAGE', value: data.memoryUsage, color: '#00ff87' }
        ];

        metrics.forEach((metric) => {
            ctx.font = '24px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText(metric.label, x + 30, dataY);
            dataY += 45;

            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = metric.color;
            ctx.fillText(metric.value, x + 30, dataY);
            dataY += 85;
        });
    },

    drawSystemData(ctx, x, y, width, height, data) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        this.roundRect(ctx, x, y, width, height, 30);
        ctx.fill();

        ctx.strokeStyle = 'rgba(138, 43, 226, 0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();

        const headerGradient = ctx.createLinearGradient(x, y, x + width, y);
        headerGradient.addColorStop(0, 'rgba(138, 43, 226, 0.1)');
        headerGradient.addColorStop(1, 'rgba(138, 43, 226, 0.3)');
        ctx.fillStyle = headerGradient;
        this.roundRect(ctx, x, y, width, 80, 30);
        ctx.fill();

        ctx.font = 'bold 42px Arial';
        ctx.fillStyle = '#b794f6';
        ctx.textAlign = 'left';
        ctx.fillText('NETWORK & SYSTEM DATA', x + 30, y + 55);

        const systemData = [
            { id: '01', label: 'NODE RUNTIME', value: data.nodeVersion, color: '#00d4ff' },
            { id: '02', label: 'PLATFORM', value: data.platform, color: '#b794f6' },
            { id: '03', label: 'OS ARCHITECTURE', value: data.arch, color: '#ff0080' },
            { id: '04', label: 'TOTAL CAPACITY', value: data.totalCapacity, color: '#ffd700' },
            { id: '05', label: 'AVAILABLE RAM', value: data.availableRAM, color: '#00ff87' },
            { id: '06', label: 'USED RAM', value: data.usedRAM, color: '#ff6b9d' },
            { id: '07', label: 'LOAD AVERAGE', value: data.loadAverage, color: '#4facfe' },
            { id: '08', label: 'HOST IDENTITY', value: data.hostname, color: '#fa709a' },
            { id: '09', label: 'CPU THREADS', value: data.cpuCores, color: '#43e97b' }
        ];

        let dataY = y + 130;
        const lineHeight = 70;

        systemData.forEach((item) => {
            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = item.color;
            ctx.fillText(item.id, x + 30, dataY);

            ctx.font = '26px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(item.label, x + 100, dataY);

            ctx.font = 'bold 28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'right';
            ctx.fillText(item.value, x + width - 30, dataY);
            ctx.textAlign = 'left';

            dataY += lineHeight;
        });
    },

    roundRect(ctx, x, y, width, height, radius) {
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
    }
};