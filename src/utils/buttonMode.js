import fs from 'fs-extra';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'data', 'settings', 'button_mode.json');

async function ensureStore() {
    await fs.ensureDir(path.dirname(FILE_PATH));
    if (!(await fs.pathExists(FILE_PATH))) {
        await fs.writeJSON(FILE_PATH, { enabled: false, updatedAt: Date.now() }, { spaces: 2 });
    }
}

export async function getButtonMode() {
    await ensureStore();
    try {
        const data = await fs.readJSON(FILE_PATH);
        return data?.enabled === true;
    } catch {
        return false;
    }
}

export async function setButtonMode(enabled) {
    await ensureStore();
    const next = { enabled: !!enabled, updatedAt: Date.now() };
    await fs.writeJSON(FILE_PATH, next, { spaces: 2 });
    return next.enabled;
}
