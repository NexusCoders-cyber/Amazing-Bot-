export default {
    name: 'groupinfo',
    aliases: ['groupdetails', 'ginfo', 'group'],
    category: 'admin',
    description: 'Get detailed information about the group',
    usage: 'groupinfo',
    example: 'groupinfo',
    cooldown: 5,
    permissions: ['user'],
    groupOnly: true,

    async execute({ sock, message, from }) {
        try {
            const groupMetadata = await sock.groupMetadata(from);
            const { subject, desc, participants, creation, owner, id } = groupMetadata;

            const totalMembers = participants.length;
            const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            const superAdmins = participants.filter(p => p.admin === 'superadmin');
            const regularAdmins = participants.filter(p => p.admin === 'admin');
            const regularMembers = totalMembers - admins.length;

            const creationDate = new Date(creation * 1000).toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            
            const creationTime = new Date(creation * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const ownerNumber = owner ? owner.split('@')[0] : 'Unknown';
            const groupId = id.split('@')[0];

            let groupInfo = `Group Information\n\nName: ${subject}\nGroup ID: ${groupId}\nOwner: @${ownerNumber}\nCreated: ${creationDate} at ${creationTime}\n\nStatistics:\nTotal Members: ${totalMembers}\nSuper Admins: ${superAdmins.length}\nAdmins: ${regularAdmins.length}\nMembers: ${regularMembers}\n`;

            if (desc && desc.trim()) {
                const description = desc.length > 200 ? desc.substring(0, 200) + '...' : desc;
                groupInfo += `\nDescription:\n${description}\n`;
            }

            if (admins.length > 0 && admins.length <= 20) {
                groupInfo += `\nAdmins List:\n`;
                admins.forEach((admin, index) => {
                    const number = admin.id.split('@')[0];
                    const role = admin.admin === 'superadmin' ? 'Super Admin' : 'Admin';
                    groupInfo += `${index + 1}. ${role} - @${number}\n`;
                });
            }

            let groupPicture;
            try {
                groupPicture = await sock.profilePictureUrl(from, 'image');
            } catch (err) {
                groupPicture = 'https://i.ibb.co/2M7rtLk/ilom.jpg';
            }

            const allMentions = [owner, ...admins.map(a => a.id)].filter(Boolean);

            await sock.sendMessage(from, {
                image: { url: groupPicture },
                caption: groupInfo,
                mentions: allMentions
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `Error: Failed to fetch group info\n${error.message}`
            }, { quoted: message });
        }
    }
};
