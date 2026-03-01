import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getUser, createUser, getAllUsers } from '../../models/User.js';
import axios from 'axios';

export default {
    name: 'rank',
    aliases: ['level', 'rk'],
    category: 'general',
    description: 'View your rank card and statistics',
    usage: 'rank [@mention]',
    example: 'rank',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from, sender }) {
        try {
            let targetJid = sender;
            let targetName = message.pushName || 'User';

            if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetJid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
                const mentionedUser = await getUser(targetJid);
                targetName = mentionedUser?.name || targetJid.split('@')[0];
            }

            let user = await getUser(targetJid);
            
            if (!user) {
                user = await createUser({
                    jid: targetJid,
                    phone: targetJid.split('@')[0],
                    name: targetName,
                    economy: {
                        balance: 1000,
                        bank: 0,
                        level: 1,
                        xp: 0,
                        rank: 'Beginner',
                        dailyStreak: 0
                    },
                    statistics: {
                        commandsUsed: 0,
                        messagesSent: 0,
                        lastActive: new Date()
                    }
                });
            }

            const allUsers = await getAllUsers({}, 1000, 0);
            const userLevels = allUsers
                .map(u => u.economy?.level || 1)
                .sort((a, b) => b - a);
            const userLevel = user.economy?.level || 1;
            const globalRank = userLevels.indexOf(userLevel) + 1;

            const canvas = createCanvas(900, 400);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(0.5, '#764ba2');
            gradient.addColorStop(1, '#f093fb');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.roundRect(ctx, 20, 20, canvas.width - 40, canvas.height - 40, 20);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.roundRect(ctx, 30, 30, 340, 340, 15);
            ctx.fill();

            let profilePic;
            try {
                const ppUrl = await sock.profilePictureUrl(targetJid, 'image');
                const response = await axios.get(ppUrl, { responseType: 'arraybuffer' });
                profilePic = await loadImage(Buffer.from(response.data));
            } catch {
                profilePic = await this.createDefaultAvatar(targetName);
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(200, 200, 140, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(profilePic, 60, 60, 280, 280);
            ctx.restore();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(200, 200, 143, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 42px Arial';
            ctx.fillText(targetName.substring(0, 20), 400, 80);

            const level = user.economy?.level || 1;
            const xp = user.economy?.xp || 0;
            const rank = user.economy?.rank || 'Beginner';
            const nextLevelXP = level * 100;
            const xpProgress = (xp / nextLevelXP) * 100;

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 32px Arial';
            ctx.fillText(`Level ${level}`, 400, 130);

            ctx.fillStyle = '#e0e0e0';
            ctx.font = '24px Arial';
            ctx.fillText(rank, 400, 165);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.roundRect(ctx, 400, 190, 460, 30, 15);
            ctx.fill();

            const progressGradient = ctx.createLinearGradient(400, 190, 860, 190);
            progressGradient.addColorStop(0, '#4facfe');
            progressGradient.addColorStop(1, '#00f2fe');
            ctx.fillStyle = progressGradient;
            const progressWidth = (xpProgress / 100) * 460;
            this.roundRect(ctx, 400, 190, progressWidth, 30, 15);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Arial';
            const xpText = `${xp} / ${nextLevelXP} XP`;
            const xpTextWidth = ctx.measureText(xpText).width;
            ctx.fillText(xpText, 630 - (xpTextWidth / 2), 211);

            const stats = [
                { icon: '💰', label: 'Money', value: ((user.economy?.balance || 0) + (user.economy?.bank || 0)).toLocaleString() },
                { icon: '📊', label: 'Global Rank', value: `#${globalRank}` },
                { icon: '🔥', label: 'Streak', value: `${user.economy?.dailyStreak || 0} days` },
                { icon: '⚡', label: 'Commands', value: user.statistics?.commandsUsed || 0 }
            ];

            let statY = 260;
            stats.forEach((stat, index) => {
                const statX = 400 + (index % 2) * 240;
                if (index % 2 === 0 && index > 0) statY += 70;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                this.roundRect(ctx, statX, statY, 220, 60, 10);
                ctx.fill();

                ctx.font = '28px Arial';
                ctx.fillText(stat.icon, statX + 15, statY + 40);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px Arial';
                ctx.fillText(stat.label, statX + 60, statY + 28);

                ctx.font = '18px Arial';
                ctx.fillStyle = '#e0e0e0';
                ctx.fillText(stat.value.toString(), statX + 60, statY + 50);
            });

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(from, {
                image: buffer,
                caption: `📊 Rank Card for ${targetName}\n\n⭐ Keep using the bot to level up and climb the ranks!`,
                mentions: [targetJid]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Error generating rank card. Please try again.'
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
    },

    async createDefaultAvatar(name) {
        const canvas = createCanvas(280, 280);
        const ctx = canvas.getContext('2d');

        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 280, 280);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const initial = name.charAt(0).toUpperCase();
        ctx.fillText(initial, 140, 140);

        return canvas;
    }
};
