import config from '../../config.js';
import { updateGroup, getGroup } from '../../models/Group.js';

export default {
    name: 'antilink',
    aliases: ['anti-link', 'linkprotection'],
    category: 'admin',
    description: 'Toggle antilink protection in the group',
    usage: 'antilink [on/off]',
    example: 'antilink on',
    cooldown: 5,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: 'Error: This command works in groups only'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: 'Error: You need admin privileges to use this command'
            }, { quoted: message });
        }

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: 'Error: Make me an admin first to use this feature'
            }, { quoted: message });
        }

        try {
            const action = args[0]?.toLowerCase();
            let group;
            
            try {
                group = await getGroup(from);
            } catch (error) {
                console.error('Database error:', error);
            }
            
            const currentStatus = group?.settings?.antiLink || false;

            if (!action) {
                return await sock.sendMessage(from, {
                    text: `Antilink Status\n\nCurrent Status: ${currentStatus ? 'Enabled' : 'Disabled'}\n\nUsage: ${config.prefix}antilink [on/off]\nExample: ${config.prefix}antilink on`
                }, { quoted: message });
            }

            let newStatus;
            if (action === 'on' || action === 'enable' || action === '1' || action === 'true') {
                newStatus = true;
            } else if (action === 'off' || action === 'disable' || action === '0' || action === 'false') {
                newStatus = false;
            } else {
                return await sock.sendMessage(from, {
                    text: 'Error: Invalid option. Use: on/off or enable/disable'
                }, { quoted: message });
            }

            try {
                await updateGroup(from, {
                    $set: { 'settings.antiLink': newStatus }
                });
            } catch (error) {
                console.error('Database update error:', error);
            }

            const actionText = newStatus ? 
                'Links will be automatically deleted' : 
                'Links are now allowed';

            await sock.sendMessage(from, {
                text: `Antilink ${newStatus ? 'Enabled' : 'Disabled'}\n\nStatus: ${newStatus ? 'Active' : 'Inactive'}\nBy: @${sender.split('@')[0]}\nDate: ${new Date().toLocaleDateString()}\n\n${actionText}`,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: 'Error: Failed to update antilink settings. Try again later'
            }, { quoted: message });
        }
    }
};
