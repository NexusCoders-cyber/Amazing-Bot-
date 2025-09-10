const mongoose = require('mongoose');

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

GroupSchema.index({ name: 1 });
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

async function getGroup(jid) {
    try {
        return await Group.findOne({ jid });
    } catch (error) {
        throw error;
    }
}

async function createGroup(groupData) {
    try {
        const group = new Group(groupData);
        return await group.save();
    } catch (error) {
        throw error;
    }
}

async function updateGroup(jid, updateData) {
    try {
        return await Group.findOneAndUpdate({ jid }, updateData, { new: true, upsert: true });
    } catch (error) {
        throw error;
    }
}

async function deleteGroup(jid) {
    try {
        return await Group.findOneAndDelete({ jid });
    } catch (error) {
        throw error;
    }
}

async function getGroupStats() {
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
        throw error;
    }
}

module.exports = {
    Group,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupStats
};