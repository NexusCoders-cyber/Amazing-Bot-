import { createCanvas } from '@napi-rs/canvas';
import os from 'os';
import moment from 'moment';
import config from '../../config.js';

export default {
    name: 'status',
    aliases: ['sts', 'stat'],
    category: 'general',
    description: 'Display detailed bot status with canvas graphics',
    usage: 'status',
    example: 'status',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: false,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            const memoryUsage = process.memoryUsage();
            const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const totalMemory = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            
            const platform = os.platform();
            const nodeVersion = process.version;
            
            const now = moment();
            const currentDate = now.format('DD/MM/YYYY');
            const currentTime = now.format('hh:mm:ss A');
            
            const canvas = createCanvas(1200, 800);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(0.5, '#764ba2');
            gradient.addColorStop(1, '#f093fb');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 50; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 3 + 1;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.font = 'bold 70px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.fillText('🤖 BOT STATUS', canvas.width / 2, 100);

            ctx.shadowBlur = 0;

            const boxY = 150;
            const boxWidth = 1000;
            const boxHeight = 580;
            const boxX = (canvas.width - boxWidth) / 2;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 20);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.roundRect(ctx, boxX + 20, boxY + 20, boxWidth - 40, 150, 15);
            ctx.fill();

            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'left';
            ctx.fillText('Bot Details', boxX + 40, boxY + 65);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Name: ${config.botName}`, boxX + 40, boxY + 110);
            ctx.fillText(`Version: ${config.botVersion}`, boxX + 40, boxY + 145);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.roundRect(ctx, boxX + 20, boxY + 190, boxWidth - 40, 150, 15);
            ctx.fill();

            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#00ff88';
            ctx.fillText('System Status', boxX + 40, boxY + 235);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`, boxX + 40, boxY + 280);
            ctx.fillText(`Memory: ${usedMemory}MB / ${totalMemory}MB`, boxX + 40, boxY + 315);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.roundRect(ctx, boxX + 20, boxY + 360, boxWidth - 40, 180, 15);
            ctx.fill();

            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#ff6b9d';
            ctx.fillText('Server Info', boxX + 40, boxY + 405);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Platform: ${platform}`, boxX + 40, boxY + 450);
            ctx.fillText(`Node: ${nodeVersion}`, boxX + 40, boxY + 485);
            ctx.fillText(`Date: ${currentDate} | Time: ${currentTime}`, boxX + 40, boxY + 520);

            ctx.font = '24px Arial';
            ctx.fillStyle = '#e0e0e0';
            ctx.textAlign = 'center';
            ctx.fillText(`Owner: ${config.ownerName}`, canvas.width / 2, canvas.height - 50);

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(from, {
                image: buffer
            }, { quoted: message });

        } catch (error) {
            console.error('Status command error:', error);
            
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            
            const memoryUsage = process.memoryUsage();
            const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const totalMemory = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            
            const platform = os.platform();
            const nodeVersion = process.version;
            
            const now = moment();
            const currentDate = now.format('DD/MM/YYYY');
            const currentTime = now.format('hh:mm:ss A');

            const statusText = `🤖 BOT STATUS

📝 Bot Details
Name: ${config.botName}
Version: ${config.botVersion}
Owner: ${config.ownerName}

⚡ System Status
Uptime: ${days}d ${hours}h ${minutes}m
Memory: ${usedMemory}MB / ${totalMemory}MB

🖥️ Server Info
Platform: ${platform}
Node: ${nodeVersion}
Date: ${currentDate}
Time: ${currentTime}`;

            await sock.sendMessage(from, {
                text: statusText
            }, { quoted: message });
        }
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