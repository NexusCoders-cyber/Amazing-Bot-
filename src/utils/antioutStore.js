import fs from 'fs-extra';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'antiout.json');
let cache = null;

async function load() {
    if (cache) return cache;
    try {
        const data = await fs.readJSON(FILE);
        cache = data && typeof data === 'object' ? data : {};
    } catch {
        cache = {};
    }
    return cache;
}

async function save(data) {
    cache = data;
    await fs.ensureDir(path.dirname(FILE));
    await fs.writeJSON(FILE, data, { spaces: 2 });
}

export async function isAntiOutEnabled(groupJid) {
    const data = await load();
    return data[groupJid] === true;
}

export async function setAntiOut(groupJid, enabled) {
    const data = await load();
    data[groupJid] = !!enabled;
    await save(data);
    return data[groupJid];
}
