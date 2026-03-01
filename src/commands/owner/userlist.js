import { getAllUsers, countUsers } from '../../models/User.js';

export default {
    name: 'userlist',
    aliases: ['listusers', 'users', 'allusers'],
    category: 'owner',
    description: 'List all users with their JID and information',
    usage: 'userlist [page] [filter]',
    example: 'userlist 1 premium',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, sender }) {
        try {
            await sock.sendMessage(from, {
                text: 'Fetching user data...'
            }, { quoted: message });

            const page = parseInt(args[0]) || 1;
            const filterType = args[1]?.toLowerCase();
            const limit = 20;
            const skip = (page - 1) * limit;

            let filter = {};
            let filterText = 'All Users';

            if (filterType === 'premium') {
                filter.isPremium = true;
                filterText = 'Premium Users';
            } else if (filterType === 'banned') {
                filter.isBanned = true;
                filterText = 'Banned Users';
            } else if (filterType === 'active') {
                filter['statistics.lastActive'] = { 
                    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
                };
                filterText = 'Active Users (24h)';
            }

            const totalUsers = await countUsers(filter);
            const users = await getAllUsers(filter, limit, skip);

            if (!users || users.length === 0) {
                return await sock.sendMessage(from, {
                    text: `No Users Found\n\nFilter: ${filterText}\nTry different filter or check database connection`
                }, { quoted: message });
            }

            const totalPages = Math.ceil(totalUsers / limit);
            const startNum = skip + 1;
            const endNum = Math.min(skip + limit, totalUsers);

            let userList = `User List - ${filterText}\n\n`;
            userList += `Showing ${startNum}-${endNum} of ${totalUsers} users\n`;
            userList += `Page ${page} of ${totalPages}\n\n`;

            users.forEach((user, index) => {
                const num = skip + index + 1;
                const phone = user.phone || user.jid.split('@')[0];
                const name = user.name || 'Unknown';
                const status = [];
                
                if (user.isPremium) status.push('Premium');
                if (user.isBanned) status.push('Banned');
                
                const statusText = status.length > 0 ? ` [${status.join(', ')}]` : '';
                
                const lastActive = user.statistics?.lastActive 
                    ? this.formatRelativeTime(new Date(user.statistics.lastActive))
                    : 'Never';

                userList += `${num}. ${name}${statusText}\n`;
                userList += `   JID: ${user.jid}\n`;
                userList += `   Phone: +${phone}\n`;
                userList += `   Last Active: ${lastActive}\n`;
                
                if (user.createdAt) {
                    userList += `   Joined: ${new Date(user.createdAt).toLocaleDateString()}\n`;
                }
                
                userList += `\n`;
            });

            userList += `Navigation:\n`;
            if (page > 1) {
                userList += `• Next page: .userlist ${page - 1}\n`;
            }
            if (page < totalPages) {
                userList += `• Previous page: .userlist ${page + 1}\n`;
            }
            userList += `\nFilters: all, premium, banned, active\n`;
            userList += `Example: .userlist 1 premium`;

            await sock.sendMessage(from, {
                text: userList
            }, { quoted: message });

        } catch (error) {
            console.error('Userlist command error:', error);
            
            await sock.sendMessage(from, {
                text: `Error Fetching Users\n\nError: ${error.message}\n\nPossible causes:\n• Database not connected\n• Query timeout\n• Invalid filter\n\nCheck database connection and try again`
            }, { quoted: message });
        }
    },

    formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
        return `${Math.floor(diffDays / 365)}y ago`;
    }
};
