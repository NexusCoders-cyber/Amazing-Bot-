import config from '../config.js';
import fetch from 'node-fetch';

export const formatResponse = {
    success: (title, data, footer = null) => {
        let text = `╭──⦿【 ✅ ${title.toUpperCase()} 】\n`;
        
        if (Array.isArray(data)) {
            data.forEach(item => {
                text += `│ ${item}\n`;
            });
        } else if (typeof data === 'object') {
            Object.entries(data).forEach(([key, value]) => {
                text += `│ ${key}: ${value}\n`;
            });
        } else {
            text += `│ ${data}\n`;
        }
        
        text += `╰────────────⦿`;
        
        if (footer) {
            text += `\n\n💫 ${footer}`;
        }
        
        return text;
    },

    error: (title, message, suggestion = null) => {
        let text = `╭──⦿【 ❌ ${title.toUpperCase()} 】\n`;
        text += `│\n`;
        text += `│ ${message}\n`;
        text += `│\n`;
        
        if (suggestion) {
            text += `│ 💡 𝗦𝘂𝗴𝗴𝗲𝘀𝘁𝗶𝗼𝗻:\n`;
            text += `│ ${suggestion}\n`;
            text += `│\n`;
        }
        
        text += `╰────────────⦿`;
        
        return text;
    },

    info: (title, data) => {
        let text = `╭──⦿【 ℹ️ ${title.toUpperCase()} 】\n│\n`;
        
        if (Array.isArray(data)) {
            data.forEach(item => {
                text += `│ ${item}\n`;
            });
        } else if (typeof data === 'object') {
            Object.entries(data).forEach(([key, value]) => {
                text += `│ 🔹 ${key}: ${value}\n`;
            });
        } else {
            text += `│ ${data}\n`;
        }
        
        text += `│\n╰────────────⦿`;
        
        return text;
    },

    command: (emoji, title, description, usage, footer = null) => {
        let text = `╭──⦿【 ${emoji} ${title.toUpperCase()} 】\n`;
        text += `│\n`;
        text += `│ 📝 ${description}\n`;
        text += `│\n`;
        text += `│ 📖 𝗨𝘀𝗮𝗴𝗲:\n`;
        text += `│ ${config.prefix}${usage}\n`;
        text += `│\n`;
        text += `╰────────────⦿`;
        
        if (footer) {
            text += `\n\n${footer}`;
        }
        
        return text;
    },

    list: (title, items, emoji = '✧') => {
        let text = `╭──⦿【 ${title.toUpperCase()} 】\n│\n`;
        
        items.forEach((item, index) => {
            text += `│ ${emoji} ${item}\n`;
        });
        
        text += `│\n╰────────────⦿`;
        
        return text;
    },

    async getRandomImage() {
        const animeApis = [
            'https://api.waifu.pics/sfw/waifu',
            'https://api.waifu.pics/sfw/neko',
            'https://nekos.best/api/v2/neko',
            'https://nekos.best/api/v2/waifu'
        ];
        
        try {
            const randomApi = animeApis[Math.floor(Math.random() * animeApis.length)];
            const response = await fetch(randomApi);
            const data = await response.json();
            
            if (randomApi.includes('waifu.pics')) {
                return data.url || config.botThumbnail || 'https://i.ibb.co/2M7rtLk/ilom.jpg';
            } else if (randomApi.includes('nekos.best')) {
                return data.results?.[0]?.url || config.botThumbnail || 'https://i.ibb.co/2M7rtLk/ilom.jpg';
            }
        } catch (error) {
            return config.botThumbnail || 'https://i.ibb.co/2M7rtLk/ilom.jpg';
        }
    }
};

export default formatResponse;
