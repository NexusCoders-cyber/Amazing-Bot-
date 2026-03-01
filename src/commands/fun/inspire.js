import { createCanvas } from '@napi-rs/canvas';
import axios from 'axios';
import config from '../../config.js';

const fallbackQuotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
    { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "Make it work, make it right, make it fast.", author: "Kent Beck" }
];

export default {
    name: 'inspire',
    aliases: ['motivation', 'motivate', 'inspireme'],
    category: 'fun',
    description: 'Get an inspiring quote with beautiful visual card',
    usage: 'inspire',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from }) {
        let quote;
        
        try {
            const response = await axios.get('https://zenquotes.io/api/random', {
                timeout: 5000,
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.data && response.data[0]) {
                quote = {
                    text: response.data[0].q,
                    author: response.data[0].a
                };
            } else {
                quote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            }
        } catch (error) {
            console.log('API fetch failed, using fallback quote');
            quote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        }
        
        try {
            const imageBuffer = await this.createInspireCanvas(quote.text, quote.author);
            
            const quoteText = `╭──⦿【 ✨ INSPIRATION 】
│
│ "${quote.text}"
│
│ — ${quote.author}
│
╰────────────⦿

💫 Stay motivated and keep coding!`;

            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: quoteText,
                contextInfo: {
                }
            }, { quoted: message });
        } catch (error) {
            console.error('Canvas error:', error);
            await this.sendTextQuote(sock, message, from, quote);
        }
    },

    async createInspireCanvas(quoteText, author) {
        const canvas = createCanvas(1200, 700);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#f093fb');
        gradient.addColorStop(0.5, '#f5576c');
        gradient.addColorStop(1, '#4facfe');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 90px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.fillText('✨ INSPIRATION ✨', 600, 120);

        const maxWidth = 1000;
        const lineHeight = 55;
        const words = quoteText.split(' ');
        let line = '';
        let y = 280;

        ctx.font = 'bold 42px Arial';
        ctx.fillStyle = '#ffffff';

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(`"${line}"`, 600, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(`"${line}"`, 600, y);

        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`— ${author}`, 600, y + 100);

        ctx.font = '30px Arial';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('💪 Stay motivated and keep pushing!', 600, 630);

        return canvas.toBuffer('image/png');
    },

    async sendTextQuote(sock, message, from, quote) {
        const quoteText = `╭──⦿【 ✨ INSPIRATION 】
│
│ "${quote.text}"
│
│ — ${quote.author}
│
╰────────────⦿

💫 Stay motivated and keep coding!`;

        await sock.sendMessage(from, { text: quoteText }, { quoted: message });
    }
};
