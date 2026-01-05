import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    phone: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        default: 'User'
    },
    profilePicture: {
        type: String,
        default: null
    },
    language: {
        type: String,
        default: 'en'
    },
    timezone: {
        type: String,
        default: 'UTC'
    },
    isBlocked: {
        type: Boolean,
        default: false
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
    bannedAt: {
        type: Date,
        default: null
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    premiumUntil: {
        type: Date,
        default: null
    },
    premiumType: {
        type: String,
        enum: ['basic', 'pro', 'unlimited'],
        default: null
    },
    joinedGroups: [{
        type: String
    }],
    groupRoles: {
        type: Map,
        of: String,
        default: new Map()
    },
    economy: {
        balance: {
            type: Number,
            default: 1000
        },
        bank: {
            type: Number,
            default: 0
        },
        level: {
            type: Number,
            default: 1
        },
        xp: {
            type: Number,
            default: 0
        },
        rank: {
            type: String,
            default: 'Beginner'
        },
        dailyStreak: {
            type: Number,
            default: 0
        },
        lastDaily: {
            type: Date,
            default: null
        },
        lastWeekly: {
            type: Date,
            default: null
        },
        lastWork: {
            type: Date,
            default: null
        },
        lastRob: {
            type: Date,
            default: null
        },
        inventory: [{
            item: String,
            quantity: Number,
            purchasedAt: Date
        }],
        transactions: [{
            type: {
                type: String,
                enum: ['daily', 'weekly', 'work', 'gamble', 'transfer', 'purchase', 'rob']
            },
            amount: Number,
            description: String,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    },
    gameStats: {
        gamesPlayed: {
            type: Number,
            default: 0
        },
        gamesWon: {
            type: Number,
            default: 0
        },
        totalScore: {
            type: Number,
            default: 0
        },
        achievements: [{
            name: String,
            unlockedAt: Date,
            description: String
        }],
        trivia: {
            correct: { type: Number, default: 0 },
            incorrect: { type: Number, default: 0 },
            streak: { type: Number, default: 0 }
        },
        hangman: {
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 }
        },
        math: {
            correct: { type: Number, default: 0 },
            incorrect: { type: Number, default: 0 }
        }
    },
    preferences: {
        autoRead: {
            type: Boolean,
            default: true
        },
        notifications: {
            type: Boolean,
            default: true
        },
        privacy: {
            showOnline: {
                type: Boolean,
                default: true
            },
            allowCommands: {
                type: Boolean,
                default: true
            }
        }
    },
    statistics: {
        commandsUsed: {
            type: Number,
            default: 0
        },
        messagesSent: {
            type: Number,
            default: 0
        },
        mediaShared: {
            type: Number,
            default: 0
        },
        timeSpent: {
            type: Number,
            default: 0
        },
        lastActive: {
            type: Date,
            default: Date.now
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    warnings: [{
        reason: String,
        warnedBy: String,
        warnedAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: Date
    }],
    notes: [{
        title: String,
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: Date
    }],
    reminders: [{
        message: String,
        remindAt: Date,
        createdAt: {
            type: Date,
            default: Date.now
        },
        completed: {
            type: Boolean,
            default: false
        }
    }],
    afk: {
        isAfk: {
            type: Boolean,
            default: false
        },
        reason: String,
        since: Date
    },
    cooldowns: {
        type: Map,
        of: Date,
        default: new Map()
    },
    rateLimits: {
        type: Map,
        of: {
            count: Number,
            resetTime: Date
        },
        default: new Map()
    }
}, {
    timestamps: true,
    versionKey: false
});

UserSchema.index({ 'economy.balance': -1 });
UserSchema.index({ isPremium: 1, premiumUntil: 1 });
UserSchema.index({ isBanned: 1, banUntil: 1 });
UserSchema.index({ 'statistics.lastActive': -1 });

UserSchema.methods.addBalance = function(amount) {
    this.economy.balance += amount;
    if (!this.economy.transactions) {
        this.economy.transactions = [];
    }
    this.economy.transactions.push({
        type: 'daily',
        amount: amount,
        description: 'Balance added',
        timestamp: new Date()
    });
    return this.save();
};

UserSchema.methods.removeBalance = function(amount) {
    if (this.economy.balance < amount) {
        throw new Error('Insufficient balance');
    }
    this.economy.balance -= amount;
    if (!this.economy.transactions) {
        this.economy.transactions = [];
    }
    this.economy.transactions.push({
        type: 'purchase',
        amount: -amount,
        description: 'Balance deducted',
        timestamp: new Date()
    });
    return this.save();
};

UserSchema.methods.addXP = function(amount) {
    this.economy.xp += amount;
    const newLevel = Math.floor(this.economy.xp / 100) + 1;
    
    if (newLevel > this.economy.level) {
        this.economy.level = newLevel;
        this.economy.balance += newLevel * 50;
        return { levelUp: true, newLevel };
    }
    
    return { levelUp: false, newLevel: this.economy.level };
};

UserSchema.methods.ban = function(reason, duration, bannedBy) {
    this.isBanned = true;
    this.banReason = reason;
    this.bannedBy = bannedBy;
    this.bannedAt = new Date();
    
    if (duration) {
        this.banUntil = new Date(Date.now() + duration);
    }
    
    return this.save();
};

UserSchema.methods.unban = function() {
    this.isBanned = false;
    this.banReason = null;
    this.banUntil = null;
    this.bannedBy = null;
    this.bannedAt = null;
    return this.save();
};

UserSchema.methods.warn = function(reason, warnedBy, duration = 24 * 60 * 60 * 1000) {
    if (!this.warnings) {
        this.warnings = [];
    }
    this.warnings.push({
        reason,
        warnedBy,
        warnedAt: new Date(),
        expiresAt: new Date(Date.now() + duration)
    });
    
    if (this.warnings.length >= 3) {
        return this.ban('Too many warnings', 24 * 60 * 60 * 1000, 'System');
    }
    
    return this.save();
};

UserSchema.methods.clearWarnings = function() {
    this.warnings = [];
    return this.save();
};

UserSchema.methods.setPremium = function(type, duration) {
    this.isPremium = true;
    this.premiumType = type;
    this.premiumUntil = new Date(Date.now() + duration);
    return this.save();
};

UserSchema.methods.removePremium = function() {
    this.isPremium = false;
    this.premiumType = null;
    this.premiumUntil = null;
    return this.save();
};

UserSchema.methods.setAFK = function(reason) {
    this.afk = {
        isAfk: true,
        reason: reason,
        since: new Date()
    };
    return this.save();
};

UserSchema.methods.removeAFK = function() {
    this.afk = {
        isAfk: false,
        reason: null,
        since: null
    };
    return this.save();
};

UserSchema.methods.canUseCommand = function(command) {
    if (this.isBanned) return false;
    if (!this.preferences || !this.preferences.privacy || !this.preferences.privacy.allowCommands) return false;
    
    if (this.cooldowns && this.cooldowns.get) {
        const cooldown = this.cooldowns.get(command);
        if (cooldown && Date.now() < cooldown.getTime()) return false;
    }
    
    return true;
};

UserSchema.statics.findByPhone = function(phone) {
    return this.findOne({ phone: phone.replace(/[^0-9]/g, '') });
};

UserSchema.statics.findByJid = function(jid) {
    return this.findOne({ jid });
};

UserSchema.statics.getTopUsers = function(field = 'economy.balance', limit = 10, skip = 0) {
    const sortObj = {};
    sortObj[field] = -1;
    return this.find({ isBanned: false }).sort(sortObj).skip(skip).limit(limit);
};

UserSchema.statics.getAllUsers = function(filter = {}, limit = 100, skip = 0) {
    return this.find(filter)
        .select('jid phone name isPremium isBanned statistics.lastActive createdAt')
        .sort({ 'statistics.lastActive': -1 })
        .skip(skip)
        .limit(limit);
};

UserSchema.statics.countUsers = function(filter = {}) {
    return this.countDocuments(filter);
};

UserSchema.pre('save', function(next) {
    if (this.banUntil && this.banUntil <= Date.now()) {
        this.isBanned = false;
        this.banReason = null;
        this.banUntil = null;
        this.bannedBy = null;
        this.bannedAt = null;
    }
    
    if (this.premiumUntil && this.premiumUntil <= Date.now()) {
        this.isPremium = false;
        this.premiumType = null;
        this.premiumUntil = null;
    }
    
    if (this.warnings && Array.isArray(this.warnings)) {
        this.warnings = this.warnings.filter(w => !w.expiresAt || w.expiresAt > Date.now());
    }
    
    next();
});

const User = mongoose.model('User', UserSchema);

const isDatabaseConnected = () => {
    return mongoose.connection.readyState === 1;
};

const mockUser = (jid, userData = {}) => ({
    jid: jid || userData.jid || 'mock@s.whatsapp.net',
    phone: userData.phone || jid?.split('@')[0] || '1234567890',
    name: userData.name || 'Mock User',
    isPremium: userData.isPremium || false,
    isBanned: userData.isBanned || false,
    banReason: userData.banReason || null,
    bannedBy: userData.bannedBy || null,
    bannedAt: userData.bannedAt || null,
    economy: {
        balance: userData.economy?.balance || 1000,
        bank: userData.economy?.bank || 0,
        level: userData.economy?.level || 1,
        xp: userData.economy?.xp || 0,
        rank: userData.economy?.rank || 'Beginner',
        transactions: []
    },
    statistics: {
        commandsUsed: 0,
        messagesSent: 0,
        lastActive: new Date(),
        joinedAt: userData.createdAt || new Date()
    },
    warnings: userData.warnings || [],
    cooldowns: new Map(),
    preferences: {
        privacy: {
            allowCommands: true
        }
    },
    save: async () => mockUser(jid, userData),
    addBalance: function(amount) {
        this.economy.balance += amount;
        return Promise.resolve(this);
    },
    removeBalance: function(amount) {
        if (this.economy.balance < amount) {
            throw new Error('Insufficient balance');
        }
        this.economy.balance -= amount;
        return Promise.resolve(this);
    },
    ban: function(reason, duration, bannedBy) {
        this.isBanned = true;
        this.banReason = reason;
        this.bannedBy = bannedBy;
        this.bannedAt = new Date();
        if (duration) {
            this.banUntil = new Date(Date.now() + duration);
        }
        return Promise.resolve(this);
    },
    unban: function() {
        this.isBanned = false;
        this.banReason = null;
        this.banUntil = null;
        this.bannedBy = null;
        this.bannedAt = null;
        return Promise.resolve(this);
    },
    canUseCommand: function() {
        return !this.isBanned;
    },
    ...userData
});

async function getUser(jid) {
    if (!jid) return null;
    
    if (!isDatabaseConnected()) {
        return mockUser(jid);
    }
    
    try {
        let user = await User.findOne({ jid }).maxTimeMS(5000).lean();
        if (!user) {
            return mockUser(jid);
        }
        return user;
    } catch (error) {
        console.error('Error getting user:', error.message);
        return mockUser(jid);
    }
}

async function createUser(userData) {
    if (!userData || !userData.jid) {
        return mockUser(null, userData);
    }
    
    if (!isDatabaseConnected()) {
        return mockUser(userData.jid, userData);
    }
    
    try {
        const user = new User(userData);
        return await user.save();
    } catch (error) {
        console.error('Error creating user:', error.message);
        return mockUser(userData.jid, userData);
    }
}

async function updateUser(jid, updateData) {
    if (!jid) return null;
    
    if (!isDatabaseConnected()) {
        return mockUser(jid, updateData);
    }
    
    try {
        const user = await User.findOneAndUpdate(
            { jid }, 
            updateData, 
            { new: true, upsert: true, maxTimeMS: 5000 }
        );
        return user;
    } catch (error) {
        console.error('Error updating user:', error.message);
        return mockUser(jid, updateData);
    }
}

async function deleteUser(jid) {
    if (!jid) return { deletedCount: 0 };
    
    if (!isDatabaseConnected()) {
        return { deletedCount: 1 };
    }
    
    try {
        const result = await User.findOneAndDelete({ jid });
        return result ? { deletedCount: 1 } : { deletedCount: 0 };
    } catch (error) {
        console.error('Error deleting user:', error.message);
        return { deletedCount: 0 };
    }
}

async function getUserStats() {
    if (!isDatabaseConnected()) {
        return { total: 0, premium: 0, banned: 0, active: 0 };
    }
    
    try {
        const total = await User.countDocuments();
        const premium = await User.countDocuments({ isPremium: true });
        const banned = await User.countDocuments({ isBanned: true });
        const active = await User.countDocuments({ 
            'statistics.lastActive': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        return { total, premium, banned, active };
    } catch (error) {
        console.error('Error getting user stats:', error.message);
        return { total: 0, premium: 0, banned: 0, active: 0 };
    }
}

async function getAllUsers(filter = {}, limit = 100, skip = 0) {
    if (!isDatabaseConnected()) {
        return [];
    }
    
    try {
        return await User.getAllUsers(filter, limit, skip);
    } catch (error) {
        console.error('Error getting all users:', error.message);
        return [];
    }
}

async function countUsers(filter = {}) {
    if (!isDatabaseConnected()) {
        return 0;
    }
    
    try {
        return await User.countUsers(filter);
    } catch (error) {
        console.error('Error counting users:', error.message);
        return 0;
    }
}

export default User;

export {
    User,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getUserStats,
    getAllUsers,
    countUsers
};
