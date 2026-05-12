import fs from 'fs-extra';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'settings', 'antibot.json');

async function readStore() {
    try {
        return await fs.readJSON(FILE);
    } catch {
        return { groups: {} };
    }
}

async function writeStore(data) {
    await fs.ensureDir(path.dirname(FILE));
    await fs.writeJSON(FILE, data, { spaces: 2 });
}

function ensureGroup(data, groupId) {
    if (!data.groups) data.groups = {};
    if (!data.groups[groupId]) data.groups[groupId] = { enabled: false, warnings: {}, updatedAt: Date.now() };
    if (!data.groups[groupId].warnings) data.groups[groupId].warnings = {};
    return data.groups[groupId];
}

export async function getAntiBotConfig(groupId) {
    const data = await readStore();
    return ensureGroup(data, groupId);
}

export async function setAntiBot(groupId, enabled) {
    const data = await readStore();
    const group = ensureGroup(data, groupId);
    group.enabled = !!enabled;
    group.updatedAt = Date.now();
    await writeStore(data);
    return group;
}

export async function incrementBotWarning(groupId, userJid) {
    const data = await readStore();
    const group = ensureGroup(data, groupId);
    group.warnings[userJid] = Number(group.warnings[userJid] || 0) + 1;
    group.updatedAt = Date.now();
    await writeStore(data);
    return group.warnings[userJid];
}

export async function resetBotWarning(groupId, userJid) {
    const data = await readStore();
    const group = ensureGroup(data, groupId);
    delete group.warnings[userJid];
    group.updatedAt = Date.now();
    await writeStore(data);
}
