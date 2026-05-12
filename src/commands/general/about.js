import config from '../../config.js';
import { commandHandler } from '../../handlers/commandHandler.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import moment from 'moment';
import os from 'os';
import axios from 'axios';

export default {
    name: 'about',
    aliases: ['botabout', 'botdetails'],
    category: 'general',
    description: 'Get detailed information about the bot with stunning visuals',
    usage: 'about',
    example: 'about',
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
            const uptimeString = days + 'd ' + hours + 'h ' + minutes + 'm';
            
            const memoryUsage = process.memoryUsage();
            const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            
            const commandCount = commandHandler.getCommandCount() || '120+';
            const categories = commandHandler.getAllCategories();
            const categoryCount = categories.length || 10;
            
            const canvas = createCanvas(1400, 900);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(0.3, '#16213e');
            gradient.addColorStop(0.7, '#0f3460');
            gradient.addColorStop(1, '#533483');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 100; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 2 + 0.5;
                ctx.fillStyle = 'rgba(255, 255, 255, ' + (Math.random() * 0.5 + 0.3) + ')';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 20; i++) {
                ctx.beginPath();
                ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
                ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
                ctx.stroke();
            }

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.roundRect(ctx, 50, 50, canvas.width - 100, canvas.height - 100, 30);
            ctx.fill();

            let botLogo;
            try {
                const logoResponse = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 5000 });
                botLogo = await loadImage(logoResponse.data.url);
            } catch {
                botLogo = null;
            }

            if (botLogo) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(200, 180, 80, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(botLogo, 120, 100, 160, 160);
                ctx.restore();
                
                ctx.strokeStyle = '#00ff88';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(200, 180, 80, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.font = 'bold 90px Arial';
            ctx.fillStyle = '#00ff88';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 255, 136, 0.8)';
            ctx.shadowBlur = 20;
            ctx.fillText(config.botName || 'ASTA BOT', canvas.width / 2, 180);
            ctx.shadowBlur = 0;

            ctx.font = '40px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.fillText('v' + (config.botVersion || '1.0.0') + ' • Premium WhatsApp Bot', canvas.width / 2, 230);

            const boxStartY = 280;
            const boxSpacing = 150;
            const boxWidth = 600;
            const boxHeight = 120;

            ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
            ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
            ctx.lineWidth = 2;
            this.roundRect(ctx, 100, boxStartY, boxWidth, boxHeight, 15);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 35px Arial';
            ctx.fillStyle = '#00ff88';
            ctx.textAlign = 'left';
            ctx.fillText('⚡ PERFORMANCE', 120, boxStartY + 45);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('⏰ Uptime: ' + uptimeString, 120, boxStartY + 80);
            ctx.fillText('🧠 Memory: ' + usedMemory + 'MB / ' + totalMemory + 'GB', 380, boxStartY + 80);

            ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            this.roundRect(ctx, 740, boxStartY, boxWidth, boxHeight, 15);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 35px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.fillText('📊 COMMANDS', 760, boxStartY + 45);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('🎮 Total: ' + commandCount + ' Commands', 760, boxStartY + 80);
            ctx.fillText('📂 Categories: ' + categoryCount, 1050, boxStartY + 80);

            ctx.fillStyle = 'rgba(255, 107, 157, 0.1)';
            ctx.strokeStyle = 'rgba(255, 107, 157, 0.5)';
            this.roundRect(ctx, 100, boxStartY + boxSpacing, boxWidth, boxHeight, 15);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 35px Arial';
            ctx.fillStyle = '#ff6b9d';
            ctx.fillText('🖥️ SYSTEM', 120, boxStartY + boxSpacing + 45);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('💻 Platform: ' + os.platform().toUpperCase(), 120, boxStartY + boxSpacing + 80);
            ctx.fillText('📦 Node: ' + process.version, 420, boxStartY + boxSpacing + 80);

            ctx.fillStyle = 'rgba(138, 135, 250, 0.1)';
            ctx.strokeStyle = 'rgba(138, 135, 250, 0.5)';
            this.roundRect(ctx, 740, boxStartY + boxSpacing, boxWidth, boxHeight, 15);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 35px Arial';
            ctx.fillStyle = '#8a87fa';
            ctx.fillText('👨‍💻 DEVELOPER', 760, boxStartY + boxSpacing + 45);

            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('👑 Owner: ' + (config.ownerName || 'Ilom'), 760, boxStartY + boxSpacing + 80);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.roundRect(ctx, 100, boxStartY + (boxSpacing * 2), 1240, 150, 15);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 35px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText('🌟 PREMIUM FEATURES', 120, boxStartY + (boxSpacing * 2) + 45);

            ctx.font = '26px Arial';
            ctx.fillStyle = '#e0e0e0';
            const features = ['🎮 Games', '🤖 AI Chat', '📥 Downloader', '🎨 Canvas', '💰 Economy', '🛡️ Admin Tools'];
            const featureX = 120;
            const featureY = boxStartY + (boxSpacing * 2) + 85;
            features.forEach((feature, i) => {
                ctx.fillText(feature, featureX + (i * 200), featureY);
            });

            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = '#00ff88';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ Always Online • 24/7 Active • Ultra Fast Response', canvas.width / 2, canvas.height - 80);

            ctx.font = '26px Arial';
            ctx.fillStyle = '#a0a0a0';
            ctx.fillText('Built with ❤️ by ' + (config.ownerName || 'Ilom') + ' • Powered by Baileys', canvas.width / 2, canvas.height - 40);

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(from, {
                image: buffer
            }, { quoted: message });

        } catch (error) {
            console.error('About command error:', error);
            
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const uptimeString = days + 'd ' + hours + 'h ' + minutes + 'm';
            
            const memoryUsage = process.memoryUsage();
            const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            
            const commandCount = commandHandler.getCommandCount() || '120+';
            const categories = commandHandler.getAllCategories();
            const categoryCount = categories.length || 10;

            const aboutText = '╭──⦿【 🤖 ABOUT BOT 】\n' +
                '│ 🎯 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲: ' + (config.botName || 'Asta Bot') + '\n' +
                '│ 📌 𝗩𝗲𝗿𝘀𝗶𝗼𝗻: ' + (config.botVersion || '1.0.0') + '\n' +
                '│ 👨‍💻 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿: ' + (config.ownerName || 'Ilom') + '\n' +
                '│ 🌐 𝗣𝗹𝗮𝘁𝗳𝗼𝗿𝗺: ' + process.platform + '\n' +
                '│ 📦 𝗡𝗼𝗱𝗲: ' + process.version + '\n' +
                '│ 📚 𝗟𝗶𝗯𝗿𝗮𝗿𝘆: Baileys\n' +
                '╰────────⦿\n\n' +
                '╭──⦿【 📊 PERFORMANCE 】\n' +
                '│ ⏰ 𝗨𝗽𝘁𝗶𝗺𝗲: ' + uptimeString + '\n' +
                '│ 🧠 𝗠𝗲𝗺𝗼𝗿𝘆: ' + usedMemory + ' MB\n' +
                '│ 🎮 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀: ' + commandCount + ' Commands\n' +
                '│ 📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝗶𝗲𝘀: ' + categoryCount + ' Categories\n' +
                '│ 🔋 𝗦𝘁𝗮𝘁𝘂𝘀: Online ✅\n' +
                '╰────────⦿\n\n' +
                '╭──⦿【 🌟 FEATURES 】\n' +
                '│ ✧ 🎮 Interactive Games\n' +
                '│ ✧ 🤖 AI Integration\n' +
                '│ ✧ 📥 Media Downloader\n' +
                '│ ✧ 🎨 Canvas Processing\n' +
                '│ ✧ 🛡️ Admin Tools\n' +
                '│ ✧ 💰 Economy System\n' +
                '│ ✧ 🔧 Utility Tools\n' +
                '│ ✧ 📊 Analytics\n' +
                '╰────────⦿\n\n' +
                '╭─────────────⦿\n' +
                '│💫 | [ ' + (config.botName || 'Asta Bot') + ' 🍀 ]\n' +
                '│ Built with ❤️ by ' + (config.ownerName || 'Ilom') + '\n' +
                '╰────────────⦿';

            await sock.sendMessage(from, {
                text: aboutText
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