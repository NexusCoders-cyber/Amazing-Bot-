import config from '../../config.js';
import os from 'os';
import { createCanvas } from '@napi-rs/canvas';

export default {
    name: 'info',
    aliases: ['about', 'botinfo'],
    category: 'general',
    description: 'Display detailed bot information with stunning graphics',
    usage: 'info',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from }) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const memoryUsage = process.memoryUsage();
        const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        
        const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        
        try {
            const imageBuffer = await this.createInfoCanvas(uptimeStr, usedMemory, totalMemory);
            
            const infoText = `╭──⦿【 🤖 BOT INFORMATION 】
│
│ 📱 *Name:* ${config.botName}
│ 📦 *Version:* ${config.botVersion || '1.0.0'}
│ 👨‍💻 *Developer:* ${config.ownerName}
│ 🌐 *Website:* ${config.botWebsite || 'https://ilom.tech'}
│
│ ⚙️ *SYSTEM INFO:*
│ 🕐 *Uptime:* ${uptimeStr}
│ 💾 *Memory:* ${usedMemory}MB / ${totalMemory}GB
│ 🖥️ *Platform:* ${os.platform()}
│ 📡 *Node.js:* ${process.version}
│
│ 🔧 *FEATURES:*
│ • AI Chat Integration
│ • Canvas Graphics  
│ • Media Processing
│ • Download Services
│ • Economy System
│ • Admin Tools
│ • Group Management
│
│ 📞 *SUPPORT:*
│ • Owner: ${config.ownerNumbers?.[0]?.split('@')[0] || 'Not set'}
│ • Repository: ${config.botRepository || 'Private'}
│
╰────────────────

✨ *Thank you for using ${config.botName}!*`;

            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: infoText
            }, { quoted: message });
        } catch (error) {
            console.error('Canvas error:', error);
            await this.sendTextInfo(sock, message, from, uptimeStr, usedMemory, totalMemory);
        }
    },

    async createInfoCanvas(uptime, usedMemory, totalMemory) {
        const canvas = createCanvas(1200, 700);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#16a085');
        gradient.addColorStop(0.5, '#1abc9c');
        gradient.addColorStop(1, '#2ecc71');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 70px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText('🤖 BOT INFORMATION', 600, 100);

        ctx.font = 'bold 50px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(config.botName, 600, 180);

        ctx.font = '35px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`v${config.botVersion} | Created by ${config.ownerName}`, 600, 230);

        const boxY = 270;
        const boxHeight = 350;
        const boxWidth = 1000;
        const boxX = (canvas.width - boxWidth) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 15);
        ctx.fill();

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'left';
        ctx.fillText('⚙️ System Status', 250, 330);

        ctx.font = '28px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`🕐 Uptime: ${uptime}`, 250, 380);
        ctx.fillText(`💾 Memory: ${usedMemory}MB / ${totalMemory}GB`, 250, 420);
        ctx.fillText(`🖥️ Platform: ${os.platform()}`, 250, 460);
        ctx.fillText(`📡 Node.js: ${process.version}`, 250, 500);

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('🔧 Features', 250, 560);

        ctx.font = '24px Arial';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('✓ AI Integration  ✓ Canvas Graphics  ✓ Media Tools', 250, 600);

        ctx.font = '25px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.fillText(`Powered by ${config.botName} - Always Online 🟢`, 600, 670);

        return canvas.toBuffer('image/png');
    },

    async sendTextInfo(sock, message, from, uptime, usedMemory, totalMemory) {
        const infoText = `╭─「 *BOT INFORMATION* 」
│ 🤖 *Name:* ${config.botName}
│ 📱 *Version:* ${config.botVersion || '1.0.0'}
│ 👨‍💻 *Developer:* ${config.ownerName}
│ 🌐 *Website:* ${config.botWebsite || 'https://ilom.tech'}
│ 
│ ⚙️ *SYSTEM INFO:*
│ 🕐 *Uptime:* ${uptime}
│ 💾 *Memory:* ${usedMemory}MB / ${totalMemory}GB
│ 🖥️ *Platform:* ${os.platform()}
│ 📡 *Node.js:* ${process.version}
│ 
│ 🔧 *FEATURES:*
│ • AI Chat Integration
│ • Media Processing
│ • Download Services
│ • Economy System
│ • Admin Tools
│ • Group Management
│ 
│ 📞 *SUPPORT:*
│ • Owner: ${config.ownerNumbers?.[0]?.split('@')[0] || 'Not set'}
│ • Repository: ${config.botRepository || 'Private'}
╰────────────────

✨ *Thank you for using ${config.botName}!*`;

        await sock.sendMessage(from, { text: infoText }, { quoted: message });
    }
};
