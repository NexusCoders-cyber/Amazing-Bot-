import { createCanvas } from '@napi-rs/canvas';

function drawCalendar() {
    const canvas = createCanvas(600, 500);
    const ctx = canvas.getContext('2d');
    const now = new Date();
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 600, 500);

    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(0, 0, 600, 100);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${monthNames[now.getMonth()]} ${now.getFullYear()}`, 300, 65);

    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 25px Arial';
    for (let i = 0; i < 7; i++) {
        ctx.fillText(days[i], 60 + (i * 80), 160);
    }

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const lastDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const today = now.getDate();

    let x = firstDay;
    let y = 0;
    for (let i = 1; i <= lastDate; i++) {
        const posX = 60 + (x * 80);
        const posY = 220 + (y * 60);

        if (i === today) {
            ctx.fillStyle = '#00e5ff';
            ctx.beginPath();
            ctx.arc(posX, posY - 10, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
        } else {
            ctx.fillStyle = '#ffffff';
        }

        ctx.font = '22px Arial';
        ctx.fillText(i.toString(), posX, posY);
        x++;
        if (x > 6) {
            x = 0;
            y++;
        }
    }

    return canvas.toBuffer('image/png');
}

export default {
    name: 'calendar',
    aliases: ['cal'],
    category: 'utility',
    description: 'Show a styled monthly calendar image',
    usage: 'calendar',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,

    async execute({ sock, message, from }) {
        await sock.sendMessage(from, { react: { text: '🗓️', key: message.key } });

        try {
            const calBuffer = drawCalendar();
            const dateString = new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });

            await sock.sendMessage(from, {
                image: calBuffer,
                caption: `📅 *NEXORA DIGITAL CALENDAR*\n\nToday is: *${dateString}*\n\nKeep track of your schedule! 🚀`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Could not generate calendar. ${error.message}`
            }, { quoted: message });
        }
    }
};
