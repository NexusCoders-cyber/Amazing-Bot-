export default {
    name: 'online',
    aliases: ['listonline', 'who', 'active'],
    category: 'admin',
    description: 'List online/active members in the group',
    usage: 'online',
    example: 'online',
    cooldown: 10,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from, sender }) {
        try {
            await sock.sendMessage(from, {
                text: '🔍 Checking online members...'
            }, { quoted: message });

            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;

            let onlineUsers = [];
            let checkedCount = 0;

            for (const participant of participants) {
                try {
                    const status = await sock.fetchStatus(participant.id);
                    
                    if (status) {
                        const participantNumber = participant.id.split('@')[0];
                        const role = participant.admin === 'superadmin' ? '👑' : 
                                   participant.admin === 'admin' ? '⭐' : '👤';
                        
                        onlineUsers.push({
                            jid: participant.id,
                            number: participantNumber,
                            role: role,
                            status: status.status || 'No status'
                        });
                    }
                    
                    checkedCount++;
                    
                    if (checkedCount % 10 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (err) {
                    continue;
                }
            }

            if (onlineUsers.length === 0) {
                const allMembers = participants.map((p, index) => {
                    const number = p.id.split('@')[0];
                    const role = p.admin === 'superadmin' ? '👑' : 
                               p.admin === 'admin' ? '⭐' : '👤';
                    return `${index + 1}. ${role} @${number}`;
                }).join('\n');

                const mentions = participants.map(p => p.id);

                return await sock.sendMessage(from, {
                    text: `👥 Group Members (${participants.length})\n\n${allMembers}\n\n📊 Total: ${participants.length}\n👑 = Owner | ⭐ = Admin | 👤 = Member\n\n⚠️ Online status detection limited by WhatsApp`,
                    mentions: mentions
                }, { quoted: message });
            }

            let onlineMessage = `🟢 Online/Active Members (${onlineUsers.length})\n\n`;
            
            onlineUsers.forEach((user, index) => {
                onlineMessage += `${index + 1}. ${user.role} @${user.number}\n`;
                if (user.status && user.status !== 'No status') {
                    onlineMessage += `   📝 ${user.status}\n`;
                }
            });

            onlineMessage += `\n📊 Total Active: ${onlineUsers.length}/${participants.length}\n`;
            onlineMessage += `👑 = Owner | ⭐ = Admin | 👤 = Member\n`;
            onlineMessage += `⏰ Checked: ${new Date().toLocaleTimeString()}`;

            const mentions = onlineUsers.map(u => u.jid);

            await sock.sendMessage(from, {
                text: onlineMessage,
                mentions: mentions
            }, { quoted: message });

        } catch (error) {
            console.error('Online command error:', error);
            
            try {
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants;
                
                let membersList = `👥 Group Members (${participants.length})\n\n`;
                
                participants.forEach((p, index) => {
                    const number = p.id.split('@')[0];
                    const role = p.admin === 'superadmin' ? '👑' : 
                               p.admin === 'admin' ? '⭐' : '👤';
                    membersList += `${index + 1}. ${role} @${number}\n`;
                });

                membersList += `\n📊 Total: ${participants.length}\n`;
                membersList += `👑 = Owner | ⭐ = Admin | 👤 = Member`;

                const mentions = participants.map(p => p.id);

                await sock.sendMessage(from, {
                    text: membersList,
                    mentions: mentions
                }, { quoted: message });
            } catch (fallbackError) {
                await sock.sendMessage(from, {
                    text: `❌ Error: Failed to get member list\n${fallbackError.message}`
                }, { quoted: message });
            }
        }
    }
};