const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'gpt',
    aliases: ['ai', 'chatgpt', 'ask'],
    category: 'ai',
    description: 'Chat with GPT AI assistant',
    usage: 'gpt <your question>',
    cooldown: 5,
    permissions: ['user'],

    async execute(sock, message, args) {
        if (args.length === 0) {
            return sock.sendMessage(message.key.remoteJid, {
                text: `❌ Please provide a question!\n\nUsage: ${config.prefix}gpt <your question>`
            });
        }

        const question = args.join(' ');
        
        await sock.sendMessage(message.key.remoteJid, {
            text: '🤖 *AI is thinking...*'
        });

        try {
            if (!process.env.OPENAI_API_KEY) {
                return sock.sendMessage(message.key.remoteJid, {
                    text: '❌ OpenAI API key not configured. Please contact the bot owner.'
                });
            }

            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI assistant in a WhatsApp bot. Keep responses concise and helpful.'
                    },
                    {
                        role: 'user',
                        content: question
                    }
                ],
                max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 150,
                temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const aiResponse = response.data.choices[0].message.content.trim();
            
            const replyText = `🤖 *GPT Response:*\n\n${aiResponse}`;
            
            await sock.sendMessage(message.key.remoteJid, { text: replyText });

        } catch (error) {
            console.error('GPT Error:', error.response?.data || error.message);
            
            let errorMessage = '❌ AI service temporarily unavailable. Please try again later.';
            
            if (error.response?.status === 401) {
                errorMessage = '❌ Invalid API key. Please contact the bot owner.';
            } else if (error.response?.status === 429) {
                errorMessage = '❌ AI service is busy. Please wait a moment and try again.';
            }
            
            await sock.sendMessage(message.key.remoteJid, { text: errorMessage });
        }
    }
};