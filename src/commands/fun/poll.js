export default {
    name: 'poll',
    aliases: ['createpoll', 'vote'],
    category: 'fun',
    description: 'Create a poll with a question and multiple options',
    usage: 'poll question; option1, option2, option3',
    example: 'poll What\'s your favorite color?; Red, Blue, Green, Yellow',
    cooldown: 10,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: 100,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    groupOnly: true,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, from, sender, isGroup, prefix }) {
        try {
            if (!isGroup) {
                return await sock.sendMessage(from, {
                    text: `❌ *Group Only Command*\n\nThis command can only be used in groups.\n\n💡 Polls are designed for group discussions!`
                }, { quoted: message });
            }

            const fullText = args.join(' ');
            
            if (!fullText.includes(';')) {
                return await sock.sendMessage(from, {
                    text: `❌ *Invalid Format*\n\n*Usage:* ${prefix}poll question; option1, option2, option3\n\n*Example:*\n${prefix}poll What's your favorite food?; Pizza, Burger, Sushi, Pasta\n\n💡 Use semicolon (;) to separate question from options\n💡 Use comma (,) to separate options`
                }, { quoted: message });
            }

            const [question, optionsText] = fullText.split(';');

            if (!question || !optionsText) {
                return await sock.sendMessage(from, {
                    text: `❌ *Missing Information*\n\n*Usage:* ${prefix}poll question; option1, option2, option3\n\n*Example:*\n${prefix}poll Best programming language?; JavaScript, Python, Java, C++`
                }, { quoted: message });
            }

            const options = optionsText
                .split(',')
                .map(opt => opt.trim())
                .filter(opt => opt !== '');

            if (options.length < 2) {
                return await sock.sendMessage(from, {
                    text: `❌ *Not Enough Options*\n\nPlease provide at least *2 options* for the poll.\n\n*Example:*\n${prefix}poll Do you like pizza?; Yes, No\n\n💡 You can add up to 12 options!`
                }, { quoted: message });
            }

            if (options.length > 12) {
                return await sock.sendMessage(from, {
                    text: `❌ *Too Many Options*\n\nWhatsApp polls support maximum *12 options*.\n\nYou provided ${options.length} options.\n\n💡 Please reduce your options to 12 or fewer.`
                }, { quoted: message });
            }

            const cleanQuestion = question.trim();

            if (cleanQuestion.length > 255) {
                return await sock.sendMessage(from, {
                    text: `❌ *Question Too Long*\n\nPoll question must be 255 characters or less.\n\nYour question is ${cleanQuestion.length} characters.\n\n💡 Please shorten your question.`
                }, { quoted: message });
            }

            const tooLongOptions = options.filter(opt => opt.length > 100);
            if (tooLongOptions.length > 0) {
                return await sock.sendMessage(from, {
                    text: `❌ *Options Too Long*\n\nEach option must be 100 characters or less.\n\nThese options are too long:\n${tooLongOptions.map(opt => `• ${opt.substring(0, 50)}...`).join('\n')}\n\n💡 Please shorten your options.`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '📊', key: message.key }
            });

            await sock.sendMessage(from, {
                poll: {
                    name: cleanQuestion,
                    values: options,
                    selectableCount: 1
                }
            }, { quoted: message });

            const confirmText = `╭──⦿【 📊 POLL CREATED 】
│
│ ❓ *Question:* ${cleanQuestion}
│ 📝 *Options:* ${options.length}
│ 👤 *Created by:* @${sender.split('@')[0]}
│ 📅 *Date:* ${new Date().toLocaleDateString()}
│
│ 💡 *Tip:* Everyone can vote once!
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: confirmText,
                mentions: [sender]
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Poll command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Poll Creation Failed*\n\n*Error:* ${error.message}\n\n*Possible causes:*\n• WhatsApp API issue\n• Connection problem\n• Invalid characters in text\n\n💡 Try again or contact bot owner`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};