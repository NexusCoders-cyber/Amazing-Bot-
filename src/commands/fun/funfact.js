import { createCanvas } from '@napi-rs/canvas';
import axios from 'axios';
import config from '../../config.js';

const fallbackFacts = [
    "The first computer bug was an actual bug! A moth was found in a Harvard Mark II computer in 1947.",
    "The first 1GB hard drive, released in 1980, weighed over 500 pounds and cost $40,000.",
    "The QWERTY keyboard layout was designed to slow down typing to prevent mechanical typewriters from jamming.",
    "Google's original name was 'Backrub' before it became Google in 1997.",
    "The first website ever created is still online at info.cern.ch",
    "Python is named after Monty Python, not the snake.",
    "The first computer programmer was a woman named Ada Lovelace in the 1840s."
];

export default {
    name: 'funfact',
    aliases: ['fact', 'randomfact', 'techfact'],
    category: 'fun',
    description: 'Get an interesting fun fact with visual card',
    usage: 'funfact',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from }) {
        let fact;
        
        try {
            const response = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en', {
                timeout: 5000,
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.data && response.data.text) {
                fact = response.data.text;
            } else {
                fact = fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
            }
        } catch (error) {
            console.log('API fetch failed, using fallback fact');
            fact = fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
        }
        
        try {
            const imageBuffer = await this.createFactCanvas(fact);
            
            const factText = `╭──⦿【 🧠 FUN FACT 】
│
│ ${fact}
│
╰────────────⦿

🎯 Did you know? Share this fact!`;

            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: factText
            }, { quoted: message });
        } catch (error) {
            console.error('Canvas error:', error);
            await this.sendTextFact(sock, message, from, fact);
        }
    },

    async createFactCanvas(factText) {
        const canvas = createCanvas(1200, 700);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#11998e');
        gradient.addColorStop(0.5, '#38ef7d');
        gradient.addColorStop(1, '#00d2ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.fillText('🧠 FUN FACT', 600, 120);

        const boxY = 200;
        const boxHeight = 350;
        const boxWidth = 1000;
        const boxX = (canvas.width - boxWidth) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
        ctx.fill();

        const maxWidth = 900;
        const lineHeight = 50;
        const words = factText.split(' ');
        let line = '';
        let y = 300;

        ctx.font = '36px Arial';
        ctx.fillStyle = '#ffffff';

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, 600, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 600, y);

        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('💡 Share this amazing fact!', 600, 630);

        return canvas.toBuffer('image/png');
    },

    async sendTextFact(sock, message, from, fact) {
        const factText = `╭──⦿【 🧠 FUN FACT 】
│
│ ${fact}
│
╰────────────⦿

🎯 Did you know? Share this fact!`;

        await sock.sendMessage(from, { text: factText }, { quoted: message });
    }
};
