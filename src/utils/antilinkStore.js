import mongoose from 'mongoose';
import fs from 'fs-extra';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'antilink.json');
const memoryStore = new Map();

const antilinkSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    mode: { type: String, enum: ['delete', 'kick', 'deletekick'], default: 'delete' }
});

function getModel() { try { return mongoose.model('Antilink'); } catch { return mongoose.model('Antilink', antilinkSchema); } }
const isDbConnected = () => mongoose.connection.readyState === 1;
async function readJson() { try { await fs.ensureDir(path.dirname(DATA_FILE)); if (!await fs.pathExists(DATA_FILE)) return {}; return await fs.readJson(DATA_FILE);} catch { return {}; } }
async function writeJson(data) { try { await fs.ensureDir(path.dirname(DATA_FILE)); await fs.writeJson(DATA_FILE, data, { spaces: 2 }); } catch {} }

const normalizeCfg = (cfg) => ({ enabled: !!cfg?.enabled, mode: ['delete', 'kick', 'deletekick'].includes(cfg?.mode) ? cfg.mode : 'delete' });

export async function getGroupAntilink(groupId) {
    if (memoryStore.has(groupId)) return normalizeCfg(memoryStore.get(groupId));
    if (isDbConnected()) {
        try { const doc = await getModel().findOne({ groupId }); if (doc) { const cfg = normalizeCfg(doc); memoryStore.set(groupId, cfg); return cfg; } } catch {}
    }
    const data = await readJson();
    const cfg = normalizeCfg(data[groupId] || { enabled: false, mode: 'delete' });
    memoryStore.set(groupId, cfg);
    return cfg;
}

export async function setGroupAntilink(groupId, enabled, mode = 'delete') {
    const cfg = normalizeCfg({ enabled, mode });
    memoryStore.set(groupId, cfg);
    if (isDbConnected()) {
        try { await getModel().findOneAndUpdate({ groupId }, { $set: cfg }, { upsert: true, new: true }); } catch {}
    }
    const data = await readJson();
    data[groupId] = cfg;
    await writeJson(data);
    return isDbConnected() ? 'db' : 'json';
}
