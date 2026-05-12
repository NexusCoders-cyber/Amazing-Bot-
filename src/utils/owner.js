import fs from 'fs';
import path from 'path';

const PATH_FILE = path.join(process.cwd(), 'owners.json');

function ensureOwnersFile() {
  if (!fs.existsSync(PATH_FILE)) {
    fs.writeFileSync(PATH_FILE, JSON.stringify([], null, 2));
  }
}

export function getOwners() {
  ensureOwnersFile();
  try {
    const data = JSON.parse(fs.readFileSync(PATH_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function normalizeJid(numberOrJid = '') {
  const digits = String(numberOrJid).replace(/[^0-9]/g, '');
  return digits ? `${digits}@s.whatsapp.net` : '';
}

export function isOwner(jid = '') {
  const owners = getOwners();
  const norm = normalizeJid(jid);
  return !!norm && owners.includes(norm);
}

export function isMainOwner(jid = '') {
  const owners = getOwners();
  const norm = normalizeJid(jid);
  return owners[0] === norm;
}

export function addOwner(number = '') {
  const owners = getOwners();
  const jid = normalizeJid(number);
  if (!jid) return { success: false, msg: 'Invalid number' };
  if (owners.includes(jid)) return { success: false, msg: 'Already an owner' };
  owners.push(jid);
  fs.writeFileSync(PATH_FILE, JSON.stringify(owners, null, 2));
  return { success: true, msg: `Added ${number}` };
}

export function delOwner(number = '') {
  const owners = getOwners();
  const jid = normalizeJid(number);
  if (!jid) return { success: false, msg: 'Invalid number' };
  if (owners[0] === jid) return { success: false, msg: "Can't remove main owner" };
  const filtered = owners.filter((o) => o !== jid);
  if (filtered.length === owners.length) return { success: false, msg: 'Not an owner' };
  fs.writeFileSync(PATH_FILE, JSON.stringify(filtered, null, 2));
  return { success: true, msg: `Removed ${number}` };
}
