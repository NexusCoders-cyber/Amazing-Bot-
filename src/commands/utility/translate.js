import axios from 'axios';
import config from '../../config.js';

const translateSettings = new Map(); // Key: groupId, Value: { autoTranslate: bool, emoji: string }

export default {
    name: 'translate',
    aliases: ['trans'],
    category: 'utility',
    description: 'Translate text or replied message to desired language',
    usage: 'translate <text> [-> <lang>]\ntranslate <lang> (reply to message)',
    example: 'translate hello -> vi\ntranslate en (reply to message)',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    supportsReply: true,
    supportsChat: true,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from, sender, isGroup, prefix }) {
        let content = args.join(' ').trim();
        let langCodeTrans = 'en'; // Default to English

        // Handle -r commands for auto-translation
        if (content.startsWith('-r')) {
            const subArgs = content.split(' ').slice(1);
            const subCommand = subArgs[0]?.toLowerCase();

            if (subCommand === 'on') {
                translateSettings.set(from, { autoTranslate: true, emoji: '🌐' });
                return sock.sendMessage(from, { text: '✅ Auto-translate on reaction enabled (default emoji: 🌐)' }, { quoted: message });
            } else if (subCommand === 'off') {
                translateSettings.set(from, { autoTranslate: false, emoji: '🌐' });
                return sock.sendMessage(from, { text: '✅ Auto-translate on reaction disabled' }, { quoted: message });
            } else if (subCommand === 'set') {
                const newEmoji = subArgs[1];
                if (!newEmoji) return sock.sendMessage(from, { text: '❌ Provide an emoji to set' }, { quoted: message });
                translateSettings.set(from, { autoTranslate: true, emoji: newEmoji });
                return sock.sendMessage(from, { text: `✅ Reaction emoji set to ${newEmoji}` }, { quoted: message });
            } else {
                const settings = translateSettings.get(from) || { autoTranslate: false, emoji: '🌐' };
                return sock.sendMessage(from, { text: `Current: Auto-translate ${settings.autoTranslate ? 'ON' : 'OFF'} (emoji: ${settings.emoji})\n\nUsage: ${prefix}translate -r [on/off/set <emoji>]` }, { quoted: message });
            }
        }

        // Handle reply for content
        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const repliedContent = message.message.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                                   message.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || '';
            if (repliedContent) {
                content = repliedContent;
                // If first arg is lang code, use it for translation
                if (args[0] && args[0].length === 2 && /^[a-z]{2}$/.test(args[0])) {
                    langCodeTrans = args[0];
                }
            }
        }

        if (!content) {
            return sock.sendMessage(from, { text: `💡 Usage: ${prefix}translate <text> [-> <lang>]\nOr reply to message: ${prefix}translate <lang>\nExample: ${prefix}translate hello -> vi\n${prefix}translate en (reply)` }, { quoted: message });
        }

        // Parse lang if provided (text -> lang)
        let separatorIndex = content.lastIndexOf('->');
        if (separatorIndex === -1) separatorIndex = content.lastIndexOf('=>');
        if (separatorIndex !== -1 && (content.length - separatorIndex <= 5)) {
            langCodeTrans = content.slice(separatorIndex + 2).trim();
            content = content.slice(0, separatorIndex).trim();
        }

        // Fetch translation
        try {
            const response = await axios.get(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCodeTrans}&dt=t&q=${encodeURIComponent(content)}`
            );
            const data = response.data[0][0];
            const translated = data[0];
            const detectedLang = data[1];

            const resultText = `${translated}\n\n🌐 ${detectedLang} → ${langCodeTrans}`;

            await sock.sendMessage(from, { text: resultText }, { quoted: message });

        } catch (error) {
            console.error('Translate error:', error);
            await sock.sendMessage(from, { text: `❌ Translation failed: ${error.message}` }, { quoted: message });
        }
    }
};