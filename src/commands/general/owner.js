const config = require('../../config');

module.exports = {
    name: 'owner',
    aliases: ['creator', 'developer'],
    category: 'general',
    description: 'Get owner contact information',
    usage: 'owner',
    cooldown: 5,
    permissions: ['user'],

    async execute(sock, message) {
        const ownerText = `╭─「 *BOT OWNER* 」
│ 👨‍💻 *Developer:* Ilom
│ 📱 *Contact:* ${config.ownerNumbers?.[0] || 'Not set'}
│ 🌐 *Website:* ${config.website || 'https://ilom.tech'}
│ 📧 *Support:* ${config.supportEmail || 'Contact via WhatsApp'}
│ 
│ 💼 *SERVICES:*
│ • Custom Bot Development
│ • WhatsApp Automation
│ • AI Integration
│ • Web Development
│ 
│ 🤝 *SUPPORT:*
│ • Bug Reports
│ • Feature Requests
│ • Technical Support
│ • Custom Solutions
╰────────────────

✨ *Thanks for using our bot!*`;

        const ownerNumber = config.ownerNumbers?.[0];
        if (ownerNumber) {
            const ownerVcard = `BEGIN:VCARD
VERSION:3.0
FN:Ilom - Bot Developer
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

            await sock.sendMessage(message.key.remoteJid, {
                contacts: {
                    displayName: 'Ilom - Bot Developer',
                    contacts: [{
                        vcard: ownerVcard
                    }]
                }
            });
        }

        await sock.sendMessage(message.key.remoteJid, { text: ownerText });
    }
};