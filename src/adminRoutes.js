/**
 * loner vzn — Admin Panel Routes
 * Manage users, sessions, settings
 */

import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const DATA_FILE = path.join(__dirname, '../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'loner-vzn-admin-secret';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@loner.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'loneradmin';

// Ensure data file exists
fs.ensureFileSync(DATA_FILE);
try { JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { fs.writeFileSync(DATA_FILE, '[]'); }

function getUsers() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return []; }
}

function saveUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.admin = decoded;
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

// ─── Admin Login ───
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@loner.app').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'loneradmin';
  
  if ((email || '').toLowerCase() !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }
  
  const token = jwt.sign({ admin: true, email: adminEmail }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, admin: { email: adminEmail } });
});

// ─── Get All Users ───
router.get('/admin/users', authMiddleware, (req, res) => {
  const users = getUsers();
  res.json({ users, total: users.length });
});

// ─── Toggle User Bot Status ───
router.post('/admin/users/:id/toggle', authMiddleware, (req, res) => {
  const users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.botEnabled = user.botEnabled === false ? true : false;
  saveUsers(users);
  res.json({ success: true, botEnabled: user.botEnabled });
});

// ─── Delete User Session ───
router.delete('/admin/users/:id', authMiddleware, (req, res) => {
  let users = getUsers();
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Remove auth session
  const sessionDir = path.join(__dirname, '../sessions', user.id);
  fs.removeSync(sessionDir);
  
  // Remove from user list
  users = users.filter(u => u.id !== req.params.id);
  saveUsers(users);
  res.json({ success: true });
});

// ─── Update Global Settings ───
router.post('/admin/settings', authMiddleware, (req, res) => {
  const settings = req.body || {};
  const settingsFile = path.join(__dirname, '../data/settings.json');
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  res.json({ success: true, settings });
});

// ─── Get Global Settings ───
router.get('/admin/settings', authMiddleware, (req, res) => {
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/settings.json'), 'utf-8'));
    res.json(settings);
  } catch { res.json({}); }
});

// ─── User Dashboard (Register/Pair) ───
router.post('/user/register', async (req, res) => {
  const { phone, email, name } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  
  const users = getUsers();
  const existing = users.find(u => u.phone === phone);
  if (existing) return res.json({ user: existing, message: 'Already registered' });
  
  const user = {
    id: 'user_' + Date.now(),
    phone,
    email: email || '',
    name: name || '',
    status: 'offline',
    botEnabled: true,
    hasSession: false,
    createdAt: new Date().toISOString(),
    lastActive: null,
  };
  
  users.push(user);
  saveUsers(users);
  res.json({ user, message: 'Registered' });
});

// ─── Get User Status ───
router.get('/user/:phone/status', (req, res) => {
  const users = getUsers();
  const user = users.find(u => u.phone === req.params.phone);
  if (!user) return res.json({ registered: false });
  res.json({ registered: true, status: user.status, botEnabled: user.botEnabled, hasSession: user.hasSession });
});

export default router;
