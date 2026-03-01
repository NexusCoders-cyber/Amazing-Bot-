import mongoose from 'mongoose';
import fs from 'fs-extra';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'antilink.json');
const memoryStore = new Map();

const antilinkSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false }
});

function getModel() {
    try { return mongoose.model('Antilink'); }
    catch { return mongoose.model('Antilink', antilinkSchema); }
}

function isDbConnected() {
    return mongoose.connection.readyState === 1;
}

async function readJson() {
    try {
        await fs.ensureDir(path.dirname(DATA_FILE));
        if (!await fs.pathExists(DATA_FILE)) return {};
        return await fs.readJson(DATA_FILE);
    } catch { return {}; }
}

async function writeJson(data) {
    try {
        await fs.ensureDir(path.dirname(DATA_FILE));
        await fs.writeJson(DATA_FILE, data, { spaces: 2 });
    } catch {}
}

export async function getGroupAntilink(groupId) {
    if (memoryStore.has(groupId)) {
        return memoryStore.get(groupId) === true;
    }

    if (isDbConnected()) {
        try {
            const doc = await getModel().findOne({ groupId });
            const enabled = doc?.enabled === true;
            memoryStore.set(groupId, enabled);
            return enabled;
        } catch {}
    }

    try {
        const data = await readJson();
        const enabled = data[groupId] === true;
        memoryStore.set(groupId, enabled);
        return enabled;
    } catch {}

    memoryStore.set(groupId, false);
    return false;
}

export async function setGroupAntilink(groupId, enabled) {
    memoryStore.set(groupId, enabled === true);

    if (isDbConnected()) {
        try {
            await getModel().findOneAndUpdate(
                { groupId },
                { $set: { enabled } },
                { upsert: true, new: true }
            );
        } catch {}
    }

    try {
        const data = await readJson();
        data[groupId] = enabled === true;
        await writeJson(data);
        return isDbConnected() ? 'db' : 'json';
    } catch {}

    return 'memory';
}
