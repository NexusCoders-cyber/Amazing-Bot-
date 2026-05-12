import fs from 'fs-extra';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'suspend.json');

async function load() {
    try {
        await fs.ensureDir(path.dirname(FILE));
        return await fs.readJSON(FILE);
    } catch {
        return {};
    }
}

async function save(data) {
    await fs.ensureDir(path.dirname(FILE));
    await fs.writeJSON(FILE, data, { spaces: 2 });
}

function norm(jid = '') {
    return String(jid).split(':')[0];
}

export async function setSuspend(groupId, userId, untilTs) {
    const data = await load();
    if (!data[groupId]) data[groupId] = {};
    data[groupId][norm(userId)] = untilTs;
    await save(data);
}

export async function clearSuspend(groupId, userId) {
    const data = await load();
    if (!data[groupId]) return;
    delete data[groupId][norm(userId)];
    if (!Object.keys(data[groupId]).length) delete data[groupId];
    await save(data);
}

export async function isSuspended(groupId, userId) {
    const data = await load();
    const ts = data?.[groupId]?.[norm(userId)];
    if (!ts) return false;
    if (Date.now() > ts) {
        await clearSuspend(groupId, userId);
        return false;
    }
    return true;
}
