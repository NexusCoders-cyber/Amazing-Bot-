import mongoose from 'mongoose';
import { economyStorage } from '../utils/economyStorage.js';

const UserSchema = new mongoose.Schema({
    jid: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, index: true },
    name: { type: String, default: 'User' },
    profilePicture: { type: String, default: null },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    isBlocked: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    banUntil: { type: Date, default: null },
    bannedBy: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    isPremium: { type: Boolean, default: false },
    premiumUntil: { type: Date, default: null },
    premiumType: { type: String, enum: ['basic', 'pro', 'unlimited'], default: null },
    economy: {
        balance: { type: Number, default: 1000 },
        bank: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 },
        rank: { type: String, default: 'Beginner' },
        dailyStreak: { type: Number, default: 0 },
        lastDaily: { type: Date, default: null },
        lastWeekly: { type: Date, default: null },
        lastWork: { type: Date, default: null },
        transactions: [{ type: { type: String }, amount: Number, description: String, timestamp: { type: Date, default: Date.now } }]
    },
    statistics: {
        commandsUsed: { type: Number, default: 0 },
        messagesSent: { type: Number, default: 0 },
        lastActive: { type: Date, default: Date.now },
        joinedAt: { type: Date, default: Date.now }
    }
}, { timestamps: true, versionKey: false });

const User = mongoose.model('User', UserSchema);

const isDatabaseConnected = () => {
    return mongoose.connection.readyState === 1 && !mongoose.connection.simulated;
};

async function getUser(jid) {
    if (!jid) return null;
    
    if (isDatabaseConnected()) {
        try {
            return await User.findOne({ jid }).maxTimeMS(5000).lean();
        } catch (error) {
            console.error('Database error, falling back to JSON:', error.message);
        }
    }
    
    return await economyStorage.getUser(jid);
}

async function createUser(userData) {
    if (!userData || !userData.jid) return null;
    
    if (isDatabaseConnected()) {
        try {
            const user = new User(userData);
            return await user.save();
        } catch (error) {
            console.error('Database error, falling back to JSON:', error.message);
        }
    }
    
    return await economyStorage.createUser(userData);
}

async function updateUser(jid, updateData) {
    if (!jid) return null;
    
    if (isDatabaseConnected()) {
        try {
            return await User.findOneAndUpdate({ jid }, updateData, { new: true, upsert: true, maxTimeMS: 5000 });
        } catch (error) {
            console.error('Database error, falling back to JSON:', error.message);
        }
    }
    
    return await economyStorage.updateUser(jid, updateData);
}

async function deleteUser(jid) {
    if (!jid) return { deletedCount: 0 };
    
    if (isDatabaseConnected()) {
        try {
            const result = await User.findOneAndDelete({ jid });
            return result ? { deletedCount: 1 } : { deletedCount: 0 };
        } catch (error) {
            console.error('Database error:', error.message);
        }
    }
    
    return { deletedCount: 1 };
}

async function getUserStats() {
    if (isDatabaseConnected()) {
        try {
            const total = await User.countDocuments();
            const premium = await User.countDocuments({ isPremium: true });
            const banned = await User.countDocuments({ isBanned: true });
            const active = await User.countDocuments({ 
                'statistics.lastActive': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });
            return { total, premium, banned, active };
        } catch (error) {
            console.error('Database error, falling back to JSON:', error.message);
        }
    }
    
    const users = await economyStorage.getAllUsers({}, Infinity, 0);
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    return {
        total: users.length,
        premium: users.filter(u => u.isPremium).length,
        banned: users.filter(u => u.isBanned).length,
        active: users.filter(u => {
            const lastActive = new Date(u.statistics?.lastActive || 0).getTime();
            return lastActive >= oneDayAgo;
        }).length
    };
}

async function getAllUsers(filter = {}, limit = 100, skip = 0) {
    if (isDatabaseConnected()) {
        try {
            return await User.find(filter)
                .select('jid phone name isPremium isBanned statistics.lastActive createdAt')
                .sort({ 'statistics.lastActive': -1 })
                .skip(skip)
                .limit(limit);
        } catch (error) {
            console.error('Database error, falling back to JSON:', error.message);
        }
    }
    
    return await economyStorage.getAllUsers(filter, limit, skip);
}

async function countUsers(filter = {}) {
    if (isDatabaseConnected()) {
        try {
            return await User.countDocuments(filter);
        } catch (error) {
            console.error('Database error, falling back to JSON:', error.message);
        }
    }
    
    return await economyStorage.countUsers(filter);
}

export default User;
export { User, getUser, createUser, updateUser, deleteUser, getUserStats, getAllUsers, countUsers };
