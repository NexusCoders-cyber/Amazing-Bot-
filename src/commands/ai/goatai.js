import axios from 'axios';

const DEFAULT_ENDPOINT = 'https://school-project-lianefca.bene-edu-ph.repl.co/ask/goatai';

const COMMAND_SCHEMA_HINT = `Use this command schema exactly:\nexport default {\n  name, aliases, category, description, usage, example, cooldown, permissions,\n  async execute({ sock, message, args, from, sender, prefix }) { ... }\n};`;

export default {
    name: 'goatai',
    aliases: ['cmdai', 'commandai'],
    category: 'ai',
    description: 'Generate Amazing Bot command code using AI',
    usage: 'goatai <what command to create>',
    example: 'goatai make a weather command with city argument',
    cooldown: 8,
    permissions: ['owner'],
    ownerOnly: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const prompt = args.join(' ').trim();
        if (!prompt) {
            await sock.sendMessage(from, {
                text: '❌ Usage: goatai <prompt>'
            }, { quoted: message });
            return;
        }

        const endpoint = process.env.GOATAI_API || DEFAULT_ENDPOINT;
        const fullPrompt = `${prompt}\n\n${COMMAND_SCHEMA_HINT}\nUse ESM imports, no module.exports, no require.`;

        try {
            await sock.sendMessage(from, { text: '🧠 Generating command structure...' }, { quoted: message });

            const { data } = await axios.get(endpoint, {
                params: { query: fullPrompt },
                timeout: 30000
            });

            const text = data?.message || data?.result || data?.response;
            if (!text) {
                throw new Error('Empty AI response');
            }

            await sock.sendMessage(from, {
                text: `✅ Generated command draft:\n\n${text}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ AI request failed: ${error.message}`
            }, { quoted: message });
        }
    }
};
