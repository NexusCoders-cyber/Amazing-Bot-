import config from '../../config.js';
import fs from 'fs-extra';
import path from 'path';

export default {
    name: 'selfmode',
    aliases: ['selflistening', 'sm'],
    category: 'owner',
    description: 'Enable or disable bot self-listening to its own messages',
    usage: '.selfmode <on/off>',
    example: '.selfmode on\n.selfmode off',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    args: false,
    minArgs: 0,
    maxArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const action = args[0]?.toLowerCase();

        if (!action || (action !== 'on' && action !== 'off' && action !== 'status')) {
            const currentStatus = config.selfMode ? 'ON ✅' : 'OFF ❌';
            return await sock.sendMessage(from, {
                text: `╭──⦿【 🔄 SELF MODE 】
│
│ 📊 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗦𝘁𝗮𝘁𝘂𝘀: ${currentStatus}
│
│ 💡 𝗨𝘀𝗮𝗴𝗲:
│    • .selfmode on - Enable self-listening
│    • .selfmode off - Disable self-listening
│    • .selfmode status - Check status
│
│ 📝 𝗪𝗵𝗮𝘁 𝗶𝘀 𝗦𝗲𝗹𝗳 𝗠𝗼𝗱𝗲?
│    When enabled, the bot will respond
│    to its own messages. Useful for testing
│    and automation. Disabled by default.
│
╰────────⦿`
            }, { quoted: message });
        }

        if (action === 'status') {
            const currentStatus = config.selfMode ? 'ENABLED ✅' : 'DISABLED ❌';
            const statusEmoji = config.selfMode ? '🟢' : '🔴';
            
            return await sock.sendMessage(from, {
                text: `╭──⦿【 🔄 SELF MODE STATUS 】
│
│ ${statusEmoji} 𝗦𝘁𝗮𝘁𝘂𝘀: ${currentStatus}
│
│ 📊 𝗗𝗲𝘁𝗮𝗶𝗹𝘀:
│    • Self-listening: ${config.selfMode ? 'Active' : 'Inactive'}
│    • Bot processes own messages: ${config.selfMode ? 'Yes' : 'No'}
│    • Auto responses to self: ${config.selfMode ? 'Enabled' : 'Disabled'}
│
╰────────⦿`
            }, { quoted: message });
        }

        if (action === 'on') {
            if (config.selfMode) {
                return await sock.sendMessage(from, {
                    text: `╭──⦿【 ℹ️ INFO 】
│
│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Self mode is already enabled
│
│ 📊 𝗦𝘁𝗮𝘁𝘂𝘀: Active ✅
│
╰────────⦿`
                }, { quoted: message });
            }

            config.selfMode = true;

            await sock.sendMessage(from, {
                text: `╭──⦿【 ✅ SELF MODE ENABLED 】
│
│ 🟢 𝗦𝘁𝗮𝘁𝘂𝘀: Activated
│ 👤 𝗘𝗻𝗮𝗯𝗹𝗲𝗱 𝗕𝘆: @${sender.split('@')[0]}
│ 🕐 𝗧𝗶𝗺𝗲: ${new Date().toLocaleString()}
│
│ 💡 𝗡𝗼𝘁𝗲:
│    Bot will now respond to its own
│    messages. Great for testing!
│
│ ⚠️ 𝗖𝗮𝘂𝘁𝗶𝗼𝗻:
│    This may cause message loops.
│    Monitor bot behavior carefully.
│
╰────────⦿`,
                mentions: [sender]
            }, { quoted: message });

        } else if (action === 'off') {
            if (!config.selfMode) {
                return await sock.sendMessage(from, {
                    text: `╭──⦿【 ℹ️ INFO 】
│
│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Self mode is already disabled
│
│ 📊 𝗦𝘁𝗮𝘁𝘂𝘀: Inactive ❌
│
╰────────⦿`
                }, { quoted: message });
            }

            config.selfMode = false;

            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ SELF MODE DISABLED 】
│
│ 🔴 𝗦𝘁𝗮𝘁𝘂𝘀: Deactivated
│ 👤 𝗗𝗶𝘀𝗮𝗯𝗹𝗲𝗱 𝗕𝘆: @${sender.split('@')[0]}
│ 🕐 𝗧𝗶𝗺𝗲: ${new Date().toLocaleString()}
│
│ 💡 𝗡𝗼𝘁𝗲:
│    Bot will ignore its own messages.
│    Normal operation restored.
│
╰────────⦿`,
                mentions: [sender]
            }, { quoted: message });
        }
    }
};
