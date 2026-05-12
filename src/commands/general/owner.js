import config from '../../config.js';
import { createCanvas } from '@napi-rs/canvas';

export default {
    name: 'owner',
    aliases: ['creator', 'developer'],
    category: 'general',
    description: 'Get owner contact with stunning visual card',
    usage: 'owner',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from }) {
        const ownerNumberRaw = config.ownerNumbers?.[0]?.split('@')[0] || process.env.OWNER_NUMBERS?.split(',')[0] || '';
        const ownerNumber = String(ownerNumberRaw || '').replace(/[^0-9]/g, '');
        const ownerName = config.ownerName || process.env.OWNER_NAME || 'Ilom';
        
        try {
            const imageBuffer = await this.createOwnerCanvas(ownerName, ownerNumber);
            
            const ownerText = `╭──⦿【 👑 BOT OWNER 】
╰────────⦿

╭──⦿【 👨‍💻 DEVELOPER INFO 】
│ 🎯 *Name:* ${ownerName}
│ 📱 *Contact:* ${ownerNumber}
│ 🌐 *Web:* ${config.botWebsite || 'https://ilom.tech'}
│ 📧 *Support:* Contact via WhatsApp
╰────────⦿

╭──⦿【 💼 SERVICES 】
│ ✧ Custom Bot Development
│ ✧ WhatsApp Automation
│ ✧ AI Integration
│ ✧ Web Development
│ ✧ Full Stack Solutions
╰────────⦿

╭──⦿【 🤝 SUPPORT 】
│ ✧ Bug Reports
│ ✧ Feature Requests
│ ✧ Technical Support
│ ✧ Custom Solutions
│ ✧ Consulting Services
╰────────⦿

╭─────────────⦿
│ ✨ Thanks for using our bot!
│ 💫 Contact info sent below
╰────────────⦿`;

            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: ownerText
            }, { quoted: message });

            if (ownerNumber) {
                const ownerVcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName} - Bot Developer
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

                await sock.sendMessage(from, {
                    contacts: {
                        displayName: `${ownerName} - Bot Developer`,
                        contacts: [{
                            displayName: `${ownerName} - Bot Developer`,
                            vcard: ownerVcard
                        }]
                    }
                }, { quoted: message });
            }
        } catch (error) {
            console.error('Canvas error:', error);
            await this.sendTextOwner(sock, message, from, ownerName, ownerNumber);
        }
    },

    async createOwnerCanvas(ownerName, ownerNumber) {
        const canvas = createCanvas(1200, 700);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#8e2de2');
        gradient.addColorStop(0.5, '#4a00e0');
        gradient.addColorStop(1, '#7f00ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.fillText('👑 BOT OWNER', 600, 120);

        ctx.font = 'bold 60px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(ownerName, 600, 220);

        const boxY = 280;
        const boxHeight = 320;
        const boxWidth = 900;
        const boxX = (canvas.width - boxWidth) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
        ctx.fill();

        ctx.font = 'bold 35px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('👨‍💻 Developer Information', 250, 340);

        ctx.font = '32px Arial';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText(`📱 Contact: ${ownerNumber}`, 250, 395);
        ctx.fillText(`🌐 Website: ${config.botWebsite || 'ilom.tech'}`, 250, 440);

        ctx.font = 'bold 35px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('💼 Services Offered', 250, 510);

        ctx.font = '28px Arial';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('✓ Custom Bot Development  ✓ AI Integration', 250, 555);

        ctx.font = '25px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.fillText('✨ Professional Bot Development Services ✨', 600, 650);

        return canvas.toBuffer('image/png');
    },

    async sendTextOwner(sock, message, from, ownerName, ownerNumber) {
        const ownerText = `╭──⦿【 👑 BOT OWNER 】
╰────────⦿

╭──⦿【 👨‍💻 DEVELOPER INFO 】
│ 🎯 *Name:* ${ownerName}
│ 📱 *Contact:* ${ownerNumber}
│ 🌐 *Web:* ${config.botWebsite || 'https://ilom.tech'}
│ 📧 *Support:* Contact via WhatsApp
╰────────⦿

╭──⦿【 💼 SERVICES 】
│ ✧ Custom Bot Development
│ ✧ WhatsApp Automation
│ ✧ AI Integration
│ ✧ Web Development
│ ✧ Full Stack Solutions
╰────────⦿

╭─────────────⦿
│ ✨ Thanks for using our bot!
╰────────────⦿`;

        await sock.sendMessage(from, { text: ownerText }, { quoted: message });

        if (ownerNumber) {
            const ownerVcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName} - Bot Developer
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

            await sock.sendMessage(from, {
                contacts: {
                    displayName: `${ownerName} - Bot Developer`,
                    contacts: [{
                        displayName: `${ownerName} - Bot Developer`,
                        vcard: ownerVcard
                    }]
                }
            }, { quoted: message });
        }
    }
};
