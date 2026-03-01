import mongoose from 'mongoose';

const fontSettingSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    font: { type: String, required: true, default: 'normal' },
    type: { type: String, enum: ['user', 'global'], default: 'user' },
    updatedAt: { type: Date, default: Date.now }
});

function getModel() {
    try {
        return mongoose.model('FontSetting');
    } catch {
        return mongoose.model('FontSetting', fontSettingSchema);
    }
}

const memoryStore = new Map();

const GLOBAL_KEY = '__global__';

export async function getUserFont(userId) {
    try {
        if (mongoose.connection.readyState === 1) {
            const Model = getModel();
            const global = await Model.findOne({ id: GLOBAL_KEY });
            if (global?.font && global.font !== 'normal') return global.font;
            const user = await Model.findOne({ id: userId });
            return user?.font || 'normal';
        }
    } catch {}

    const global = memoryStore.get(GLOBAL_KEY);
    if (global && global !== 'normal') return global;
    return memoryStore.get(userId) || 'normal';
}

export async function setUserFont(userId, font) {
    memoryStore.set(userId, font);
    try {
        if (mongoose.connection.readyState === 1) {
            const Model = getModel();
            await Model.findOneAndUpdate(
                { id: userId },
                { font, type: 'user', updatedAt: new Date() },
                { upsert: true, new: true }
            );
        }
    } catch {}
}

export async function setGlobalFont(font) {
    memoryStore.set(GLOBAL_KEY, font);
    try {
        if (mongoose.connection.readyState === 1) {
            const Model = getModel();
            await Model.findOneAndUpdate(
                { id: GLOBAL_KEY },
                { font, type: 'global', updatedAt: new Date() },
                { upsert: true, new: true }
            );
        }
    } catch {}
}

export async function getGlobalFont() {
    try {
        if (mongoose.connection.readyState === 1) {
            const Model = getModel();
            const doc = await Model.findOne({ id: GLOBAL_KEY });
            return doc?.font || 'normal';
        }
    } catch {}
    return memoryStore.get(GLOBAL_KEY) || 'normal';
}

export async function resetUserFont(userId) {
    memoryStore.delete(userId);
    try {
        if (mongoose.connection.readyState === 1) {
            const Model = getModel();
            await Model.findOneAndDelete({ id: userId });
        }
    } catch {}
}

export async function resetGlobalFont() {
    memoryStore.delete(GLOBAL_KEY);
    try {
        if (mongoose.connection.readyState === 1) {
            const Model = getModel();
            await Model.findOneAndDelete({ id: GLOBAL_KEY });
        }
    } catch {}
}

export async function getAllFontUsers() {
    try {
        if (mongoose.connection.readyState === 1) {
            const Model = getModel();
            return await Model.find({ type: 'user', font: { $ne: 'normal' } });
        }
    } catch {}
    return Array.from(memoryStore.entries())
        .filter(([k, v]) => k !== GLOBAL_KEY && v !== 'normal')
        .map(([id, font]) => ({ id, font }));
}
