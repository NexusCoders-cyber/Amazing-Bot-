import path from 'path';
import fs from 'fs-extra';
import { generatePairingCode, upsertPairedSessionRecord } from '../../services/pairingService.js';
import { getSessionControl, normalizePhone, updateSessionControl } from '../../utils/sessionControl.js';
import { canUseSensitiveOwnerTools, getTopOwnerNumbers, getDeveloperNumbers } from '../../utils/privilegedUsers.js';

function digits(input = '') {
    return String(input).replace(/\D/g, '');
}

function getSender(msg) {
    return msg?.key?.participant || msg?.key?.remoteJid || '';
}

function setH(msgId, author, handler, ttl = 120000) {
    if (global.replyHandlers) {
        for (const [id, h] of Object.entries(global.replyHandlers)) {
            if (h?.c === 'mgr' || h?.command === 'manager') delete global.replyHandlers[id];
        }
    }
    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[msgId] = { c: 'mgr', handler, author };
    setTimeout(() => {
        if (global.replyHandlers?.[msgId]?.handler === handler) delete global.replyHandlers[msgId];
    }, ttl);
}

const STORE = path.join(process.cwd(), 'data', 'session-control.json');

async function loadS() {
    try { return await fs.readJSON(STORE); } catch { return {}; }
}
async function saveS(d) {
    await fs.ensureDir(path.dirname(STORE));
    await fs.writeJSON(STORE, d, { spaces: 2 });
}

// Delete previous bot message then send new one
async function relay(sock, from, prevMsgId, content, quoted) {
    if (prevMsgId) {
        try { await sock.sendMessage(from, { delete: { remoteJid: from, id: prevMsgId, fromMe: true } }); } catch {}
    }
    return await sock.sendMessage(from, content, { quoted });
}

export default {
    name: 'manager',
    aliases: ['mng', 'acc', 'settings', 'panel'],
    category: 'owner',
    description: 'Account manager with reply-based navigation',
    usage: 'manager',
    cooldown: 3,

    async execute({ sock, message, from, sender }) {
        if (!canUseSensitiveOwnerTools(sender)) {
            return await sock.sendMessage(from, { text: '❌ Top owners/devs only.' }, { quoted: message });
        }
        return main(sock, from, message, sender, null);
    }
};

async function main(sock, from, msg, sender, prevId) {
    const store = await loadS();
    const sessions = Object.keys(store).sort();
    let text = '⚙️ *ACCOUNT MANAGER*\n\n━━━ Sessions ━━━\n';
    if (!sessions.length) text += '  None\n';
    else sessions.forEach((s, i) => { text += `  ${i + 1}. ${s}\n`; });
    text += '\n━━━ Options ━━━\n';
    text += '  Reply session *number* to edit\n';
    text += '  *new* — link account\n';
    text += '  *owners* — manage owners/devs\n';
    text += '  *exit* — close\n\nReply:';

    const sent = await relay(sock, from, prevId, { text }, msg);
    const author = getSender(msg);
    setH(sent.key.id, author, async (txt, rm) => {
        const c = String(txt || '').trim().toLowerCase();
        const list = Object.keys(await loadS()).sort();
        const idx = parseInt(c, 10) - 1;
        if (c === 'exit') {
            await relay(sock, from, sent.key.id, { text: '✅ Manager closed.' }, rm);
            return;
        }
        if (c === 'new') return askNum(sock, from, rm, sender, sent.key.id);
        if (c === 'owners') return showPriv(sock, from, rm, sender, sent.key.id);
        if (!isNaN(idx) && idx >= 0 && idx < list.length) return sess(sock, from, rm, sender, list[idx], sent.key.id);
        await relay(sock, from, sent.key.id, { text: '❌ Invalid. Reply number, new, owners, or exit.' }, rm);
        return main(sock, from, rm, sender, sent.key.id);
    });
}

async function sess(sock, from, msg, sender, sid, prevId) {
    const store = await loadS();
    const row = store[sid] || {};
    const p = row.prefix || '.';
    const pv = row.privateMode === true;
    const ar = row.autoRead !== false;
    const at = row.autoTyping === true;
    const ao = row.autoOnline !== false;
    const pub = row.publicMode !== false;

    let text = `⚙️ *Session: ${sid}*\n\n`;
    text += `  1. ✏️ Prefix  [${p}]\n`;
    text += `  2. 🔒 Private  [${pv ? '✅ ON' : '❌ OFF'}]\n`;
    text += `  3. 📢 A-Read  [${ar ? '✅ ON' : '❌ OFF'}]\n`;
    text += `  4. ⌨️ A-Type  [${at ? '✅ ON' : '❌ OFF'}]\n`;
    text += `  5. 🔄 A-Online  [${ao ? '✅ ON' : '❌ OFF'}]\n`;
    text += `  6. 🌐 Public  [${pub ? '✅ ON' : '❌ OFF'}]\n`;
    text += `  7. 👤 Add Admin\n`;
    text += `  8. 👑 Add Sudo\n`;
    text += `  9. 📋 View all settings\n`;
    text += `  10. 🗑️ Unlink this session\n`;
    text += `  *back* — session list\n\n`;
    text += `Reply number to toggle, "back" to return.`;

    const sent = await relay(sock, from, prevId, { text }, msg);
    const author = getSender(msg);
    setH(sent.key.id, author, async (txt, rm) => {
        const c = String(txt || '').trim().toLowerCase();
        if (c === 'back') return main(sock, from, rm, sender, sent.key.id);

        const n = parseInt(c, 10);
        if (isNaN(n) || n < 1 || n > 10) {
            await relay(sock, from, sent.key.id, { text: '❌ Reply 1-10 or "back".' }, rm);
            return sess(sock, from, rm, sender, sid, sent.key.id);
        }

        const store2 = await loadS();
        const r = store2[sid] || {};

        const toggle = async (k, label) => {
            r[k] = !r[k];
            store2[sid] = r;
            await saveS(store2);
            await relay(sock, from, sent.key.id, { text: `✅ *${sid}* — ${label}: ${r[k] ? '✅ ON' : '❌ OFF'}` }, rm);
            return sess(sock, from, rm, sender, sid, null);
        };

        if (n === 1) {
            const s2 = await relay(sock, from, sent.key.id, { text: `✏️ Reply new prefix for *${sid}*:` }, rm);
            setH(s2.key.id, author, async (t2, rm2) => {
                const p2 = String(t2 || '').trim();
                if (!p2 || p2.length > 5 || /\s/.test(p2)) {
                    await relay(sock, from, s2.key.id, { text: '❌ 1-5 non-space characters.' }, rm2);
                    return sess(sock, from, rm2, sender, sid, null);
                }
                const s3 = await loadS();
                if (!s3[sid]) s3[sid] = {};
                s3[sid].prefix = p2;
                await saveS(s3);
                await relay(sock, from, s2.key.id, { text: `✅ *${sid}* prefix: ${p2}` }, rm2);
                return sess(sock, from, rm2, sender, sid, null);
            });
            return;
        }
        if (n === 2) return toggle('privateMode', 'Private Mode');
        if (n === 3) return toggle('autoRead', 'Auto-Read');
        if (n === 4) return toggle('autoTyping', 'Auto-Typing');
        if (n === 5) return toggle('autoOnline', 'Auto-Online');
        if (n === 6) return toggle('publicMode', 'Public Mode');
        if (n === 7) return askAdd(sock, from, rm, sender, sid, 'owners', 'Admin', sent.key.id);
        if (n === 8) return askAdd(sock, from, rm, sender, sid, 'sudoers', 'Sudo', sent.key.id);
        if (n === 9) {
            const s3 = await loadS();
            const r2 = s3[sid] || {};
            await relay(sock, from, sent.key.id, {
                text: `⚙️ *${sid}*\n` +
                    `Prefix: ${r2.prefix || '.'}\n` +
                    `Private: ${r2.privateMode ? '✅ ON' : '❌ OFF'}\n` +
                    `A-Read: ${r2.autoRead !== false ? '✅ ON' : '❌ OFF'}\n` +
                    `A-Type: ${r2.autoTyping ? '✅ ON' : '❌ OFF'}\n` +
                    `A-Online: ${r2.autoOnline !== false ? '✅ ON' : '❌ OFF'}\n` +
                    `Public: ${r2.publicMode !== false ? '✅ ON' : '❌ OFF'}\n` +
                    `Admins: ${(r2.owners || []).map(n => `+${n}`).join(', ') || 'None'}\n` +
                    `Sudos: ${(r2.sudoers || []).map(n => `+${n}`).join(', ') || 'None'}`
            }, rm);
            return sess(sock, from, rm, sender, sid, null);
        }
        if (n === 10) {
            delete store2[sid];
            await saveS(store2);
            await relay(sock, from, sent.key.id, { text: `🗑️ Session *${sid}* unlinked.` }, rm);
            return main(sock, from, rm, sender, null);
        }
    });
}

async function askAdd(sock, from, msg, sender, sid, key, label, prevId) {
    const s2 = await relay(sock, from, prevId, { text: `📱 Reply phone number to add as *${label}* for ${sid}:` }, msg);
    const author = getSender(msg);
    setH(s2.key.id, author, async (txt, rm) => {
        const num = digits(txt);
        if (!num || num.length < 7) {
            await relay(sock, from, s2.key.id, { text: '❌ Invalid number.' }, rm);
            return sess(sock, from, rm, sender, sid, null);
        }
        const store = await loadS();
        if (!store[sid]) store[sid] = {};
        if (!store[sid][key]) store[sid][key] = [];
        if (!store[sid][key].includes(num)) store[sid][key].push(num);
        await saveS(store);
        await relay(sock, from, s2.key.id, { text: `✅ +${num} added as ${label}.` }, rm);
        return sess(sock, from, rm, sender, sid, null);
    });
}

async function askNum(sock, from, msg, sender, prevId) {
    const s2 = await relay(sock, from, prevId, { text: '📱 Reply phone number to pair (with country code):' }, msg);
    const author = getSender(msg);
    setH(s2.key.id, author, async (txt, rm) => {
        const num = digits(txt);
        if (!num || num.length < 10 || num.length > 15) {
            await relay(sock, from, s2.key.id, { text: '❌ Use 10-15 digits.' }, rm);
            return main(sock, from, rm, sender, null);
        }
        await relay(sock, from, s2.key.id, { text: `⏳ Pairing +${num}...` }, rm);
        try {
            const paired = await generatePairingCode(num, {
                onCodeSent: async ({ number: pn, sessionPath }) => {
                    await upsertPairedSessionRecord({ sessionId: path.basename(sessionPath || '') || 'unknown', number: pn, sessionPath: sessionPath || '', source: 'manager', status: 'code_sent' });
                }
            });
            await relay(sock, from, s2.key.id, { text: `✅ *Code:* ${paired.code}\nUse WhatsApp → Linked Devices` }, rm);
        } catch (e) {
            await relay(sock, from, s2.key.id, { text: `❌ ${e.message}` }, rm);
        }
        return main(sock, from, rm, sender, null);
    });
}

async function showPriv(sock, from, msg, sender, prevId) {
    const tops = getTopOwnerNumbers();
    const devs = getDeveloperNumbers();
    let text = '🔐 *Privileged Users*\n\n👑 Top Owners:\n' + (tops.map(n => `  • +${n}`).join('\n') || '  None') + '\n\n🛠 Developers:\n' + (devs.map(n => `  • +${n}`).join('\n') || '  None') + '\n\n  *addowner <phone>*\n  *adddev <phone>*\n  *back* — main\n\nReply:';

    const sent = await relay(sock, from, prevId, { text }, msg);
    const author = getSender(msg);
    setH(sent.key.id, author, async (txt, rm) => {
        const p = String(txt || '').trim().split(/\s+/);
        const cmd = p[0]?.toLowerCase();
        const num = digits(p.slice(1).join(' '));
        if (cmd === 'back') return main(sock, from, rm, sender, sent.key.id);
        if ((cmd === 'addowner' || cmd === 'adddev') && num && num.length >= 7) {
            const file = cmd === 'addowner' ? 'topowners.json' : 'developers.json';
            const label = cmd === 'addowner' ? 'Top Owner' : 'Developer';
            try {
                const sp = path.join(process.cwd(), 'data', file);
                await fs.ensureDir(path.dirname(sp));
                let list = [];
                try { list = await fs.readJSON(sp); } catch { list = []; }
                if (!list.includes(num)) { list.push(num); await fs.writeJSON(sp, list, { spaces: 2 }); }
                await relay(sock, from, sent.key.id, { text: `✅ +${num} added as ${label}.` }, rm);
            } catch (e) { await relay(sock, from, sent.key.id, { text: `❌ ${e.message}` }, rm); }
            return showPriv(sock, from, rm, sender, sent.key.id);
        }
        await relay(sock, from, sent.key.id, { text: '❌ Try: addowner <phone>, adddev <phone>, or back.' }, rm);
        return showPriv(sock, from, rm, sender, sent.key.id);
    });
}
