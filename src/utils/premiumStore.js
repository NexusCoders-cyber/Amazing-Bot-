import fs from 'fs-extra';
import path from 'path';

const PREM_FILE = path.join(process.cwd(), 'data', 'premium.json');

function load() {
    try { if (fs.existsSync(PREM_FILE)) return JSON.parse(fs.readFileSync(PREM_FILE, 'utf8')); } catch {}
    return { password: '0814880', users: [] };
}

function save(data) {
    fs.ensureDirSync(path.dirname(PREM_FILE));
    fs.writeFileSync(PREM_FILE, JSON.stringify(data, null, 2));
}

export function setPremiumPassword(pw) {
    const data = load();
    data.password = pw;
    save(data);
}

export function checkPremiumPassword(pw) {
    const data = load();
    return data.password === pw;
}

export function addPremiumUser(userId) {
    const data = load();
    if (!data.users.includes(userId)) data.users.push(userId);
    save(data);
}

export function removePremiumUser(userId) {
    const data = load();
    data.users = data.users.filter(u => u !== userId);
    save(data);
}

export function isPremiumUser(userId) {
    const data = load();
    return data.users.includes(userId);
}

export function isUnlocked(userId) {
    const data = load();
    return data.users.includes(userId) || data.password === '';
}
