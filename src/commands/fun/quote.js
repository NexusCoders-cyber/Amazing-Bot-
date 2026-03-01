import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default {
    name: 'quote',
    aliases: ['inspireme', 'motivation', 'wisdom', 'inspire'],
    category: 'fun',
    description: 'Generate stunning motivational quote cards with beautiful designs using live API',
    usage: 'quote [category]',
    example: 'quote\nquote life\nquote success\nquote love',
    cooldown: 8,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            await sock.sendMessage(from, {
                react: { text: '✨', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: '╭──⦿【 ✨ GENERATING 】\n│ 🎨 𝗦𝘁𝗮𝘁𝘂𝘀: Fetching quote...\n│ 🌐 𝗦𝗼𝘂𝗿𝗰𝗲: Live API\n│ ⏳ 𝗣𝗹𝗲𝗮𝘀𝗲 𝘄𝗮𝗶𝘁: Few seconds\n╰────────⦿'
            }, { quoted: message });

            const category = args[0]?.toLowerCase() || 'random';
            let quoteData;

            try {
                const response = await axios.get('https://api.quotable.io/random', {
                    params: category !== 'random' ? { tags: category } : {},
                    timeout: 10000
                });
                quoteData = {
                    text: response.data.content,
                    author: response.data.author,
                    category: response.data.tags?.[0] || 'wisdom'
                };
            } catch (apiError) {
                const fallbackResponse = await axios.get('https://zenquotes.io/api/random');
                quoteData = {
                    text: fallbackResponse.data[0].q,
                    author: fallbackResponse.data[0].a,
                    category: 'inspiration'
                };
            }

            const canvas = createCanvas(1080, 1080);
            const ctx = canvas.getContext('2d');

            const gradients = [
                { colors: ['#667eea', '#764ba2', '#f093fb'], name: 'Purple Dream' },
                { colors: ['#4facfe', '#00f2fe'], name: 'Ocean Blue' },
                { colors: ['#43e97b', '#38f9d7'], name: 'Mint Fresh' },
                { colors: ['#fa709a', '#fee140'], name: 'Sunset Vibes' },
                { colors: ['#30cfd0', '#330867'], name: 'Deep Ocean' },
                { colors: ['#a8edea', '#fed6e3'], name: 'Cotton Candy' },
                { colors: ['#ff9a56', '#ff6a88'], name: 'Warm Sunset' },
                { colors: ['#ffecd2', '#fcb69f'], name: 'Peach Glow' },
                { colors: ['#89f7fe', '#66a6ff'], name: 'Sky Blue' },
                { colors: ['#fddb92', '#d1fdff'], name: 'Golden Dawn' }
            ];

            const selectedGradient = gradients[Math.floor(Math.random() * gradients.length)];
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            
            selectedGradient.colors.forEach((color, index) => {
                gradient.addColorStop(index / (selectedGradient.colors.length - 1), color);
            });

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const radius = Math.random() * 100 + 50;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.roundRect(ctx, 80, 80, canvas.width - 160, canvas.height - 160, 40);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            this.roundRect(ctx, 120, 200, canvas.width - 240, canvas.height - 400, 30);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 180px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('"', canvas.width / 2, 320);

            ctx.fillStyle = '#2d3436';
            ctx.font = 'bold 52px Arial';
            ctx.textAlign = 'center';

            const maxWidth = canvas.width - 280;
            const words = quoteData.text.split(' ');
            let lines = [];
            let currentLine = '';

            for (const word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);

            const lineHeight = 70;
            const startY = 420;

            lines.forEach((line, index) => {
                ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight));
            });

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 180px Arial';
            ctx.fillText('"', canvas.width / 2, startY + (lines.length * lineHeight) + 80);

            ctx.fillStyle = '#636e72';
            ctx.font = 'italic 38px Arial';
            ctx.fillText(`— ${quoteData.author}`, canvas.width / 2, startY + (lines.length * lineHeight) + 180);

            const decorSize = 60;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(150, 150, decorSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(canvas.width - 150, canvas.height - 150, decorSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ILOM BOT', canvas.width / 2, canvas.height - 80);

            const buffer = canvas.toBuffer('image/png');
            const tempPath = path.join(process.cwd(), 'temp', `quote_${Date.now()}.png`);
            
            if (!fs.existsSync(path.dirname(tempPath))) {
                fs.mkdirSync(path.dirname(tempPath), { recursive: true });
            }
            
            fs.writeFileSync(tempPath, buffer);

            await sock.sendMessage(from, { delete: statusMsg.key });

            await sock.sendMessage(from, {
                image: buffer,
                caption: `╭──⦿【 ✨ QUOTE GENERATED 】
│ 🎨 𝗧𝗵𝗲𝗺𝗲: ${selectedGradient.name}
│ 💬 𝗔𝘂𝘁𝗵𝗼𝗿: ${quoteData.author}
│ 🏷️ 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${quoteData.category}
│ 📏 𝗦𝗶𝘇𝗲: 1080x1080px
│ 🎯 𝗤𝘂𝗮𝗹𝗶𝘁𝘆: HD
│ 🌐 𝗦𝗼𝘂𝗿𝗰𝗲: Live API
╰────────⦿

╭──⦿【 📚 CATEGORIES 】
│ ${prefix}quote life
│ ${prefix}quote success
│ ${prefix}quote love
│ ${prefix}quote wisdom
│ ${prefix}quote happiness
╰────────⦿

╭─────────────⦿
│💫 | [ Ilom Bot 🍀 ]
╰────────────⦿`
            }, { quoted: message });

            setTimeout(() => {
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            }, 5000);

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Quote command error:', error);
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】
│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Generation failed
│
│ ⚠️ 𝗗𝗲𝘁𝗮𝗶𝗹𝘀: ${error.message}
╰────────⦿`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
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