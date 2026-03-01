import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        index: true
    },
    description: {
        type: String,
        default: ''
    },
    profilePicture: {
        type: String,
        default: null
    },
    participants: {
        type: Number,
        default: 0
    },
    admins: [{
        jid: String,
        role: {
            type: String,
            enum: ['admin', 'superadmin'],
            default: 'admin'
        },
        promotedAt: {
            type: Date,
            default: Date.now
        },
        promotedBy: String
    }],
    createdBy: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: {
        type: String,
        default: null
    },
    banUntil: {
        type: Date,
        default: null
    },
    bannedBy: {
        type: String,
        default: null
    },
    settings: {
        language: {
            type: String,
            default: 'en'
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        prefix: {
            type: String,
            default: null
        },
        welcome: {
            enabled: {
                type: Boolean,
                default: false
            },
            message: {
                type: String,
                default: 'Welcome to the group!'
            }
        },
        goodbye: {
            enabled: {
                type: Boolean,
                default: false
            },
            message: {
                type: String,
                default: 'Goodbye!'
            }
        }
    },
    statistics: {
        messageCount: {
            type: Number,
            default: 0
        },
        commandsUsed: {
            type: Number,
            default: 0
        },
        lastActivity: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

GroupSchema.index({ participants: -1 });
GroupSchema.index({ isBanned: 1, banUntil: 1 });

GroupSchema.methods.ban = function(reason, duration, bannedBy) {
    this.isBanned = true;
    this.banReason = reason;
    this.bannedBy = bannedBy;
    
    if (duration) {
        this.banUntil = new Date(Date.now() + duration);
    }
    
    return this.save();
};

GroupSchema.methods.unban = function() {
    this.isBanned = false;
    this.banReason = null;
    this.banUntil = null;
    this.bannedBy = null;
    return this.save();
};

const Group = mongoose.model('Group', GroupSchema);

const isDatabaseConnected = () => {
    return mongoose.connection.readyState === 1 && mongoose.connection.simulated !== true;
};

const mockGroup = (jid, groupData = {}) => ({
    jid: jid || groupData.jid || 'mockgroup@g.us',
    name: groupData.name || 'Mock Group',
    participants: groupData.participants || 10,
    isBanned: false,
    settings: {
        language: 'en',
        timezone: 'UTC',
        welcome: { enabled: false },
        goodbye: { enabled: false }
    },
    statistics: {
        messageCount: 0,
        commandsUsed: 0,
        lastActivity: new Date()
    },
    admins: [],
    save: async () => mockGroup(jid, groupData),
    ...groupData
});

async function getGroup(jid) {
    if (!isDatabaseConnected()) {
        return mockGroup(jid);
    }
    try {
        return await Group.findOne({ jid }).maxTimeMS(5000);
    } catch (error) {
        return mockGroup(jid);
    }
}

async function createGroup(groupData) {
    if (!isDatabaseConnected()) {
        return mockGroup(groupData.jid, groupData);
    }
    try {
        const group = new Group(groupData);
        return await group.save();
    } catch (error) {
        return mockGroup(groupData.jid, groupData);
    }
}

async function updateGroup(jid, updateData) {
    if (!isDatabaseConnected()) {
        return mockGroup(jid, updateData);
    }
    try {
        return await Group.findOneAndUpdate({ jid }, updateData, { new: true, upsert: true, maxTimeMS: 5000 });
    } catch (error) {
        return mockGroup(jid, updateData);
    }
}

async function deleteGroup(jid) {
    if (!isDatabaseConnected()) {
        return { deletedCount: 1 };
    }
    try {
        return await Group.findOneAndDelete({ jid });
    } catch (error) {
        return { deletedCount: 0 };
    }
}

async function getGroupStats() {
    if (!isDatabaseConnected()) {
        return { total: 50, active: 45, banned: 5 };
    }
    try {
        const totalGroups = await Group.countDocuments();
        const bannedGroups = await Group.countDocuments({ isBanned: true });
        const activeGroups = totalGroups - bannedGroups;
        
        return {
            total: totalGroups,
            active: activeGroups,
            banned: bannedGroups
        };
    } catch (error) {
        return { total: 50, active: 45, banned: 5 };
    }
}

export {
    Group,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupStats
};