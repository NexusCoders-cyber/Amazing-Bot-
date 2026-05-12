import fs from 'fs-extra';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'settings', 'antihijack.json');

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

export async function getAntiHijackConfig(groupId) {
    const data = await readStore();
    return data.groups?.[groupId] || { enabled: false, ownerJid: '', updatedAt: 0 };
}

export async function setAntiHijackConfig(groupId, enabled, ownerJid = '') {
    const data = await readStore();
    if (!data.groups) data.groups = {};
    data.groups[groupId] = {
        enabled: !!enabled,
        ownerJid: ownerJid || data.groups[groupId]?.ownerJid || '',
        updatedAt: Date.now()
    };
    await writeStore(data);
    return data.groups[groupId];
}
