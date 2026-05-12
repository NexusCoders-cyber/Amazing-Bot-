export default {
    name: 'triviaai',
    aliases: ['codeai', 'rewrite'],
    category: 'ai',
    description: 'Basic AI helper placeholder',
    usage: 'triviaai <prompt>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const prompt = args.join(' ').trim();
        let text = `🤖 AI helper\n\nPrompt: ${prompt}\n\n`;

        if (prompt.length < 10) {
            text += 'Please send a more detailed prompt for better output.';
        } else {
            text += 'This command is active. Connect a provider key (Gemini/OpenAI) in env for full generation.';
        }

        await sock.sendMessage(from, { text }, { quoted: message });
    }
};
