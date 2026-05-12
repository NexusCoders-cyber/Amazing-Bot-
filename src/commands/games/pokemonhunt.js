import fs from 'fs-extra';

import path from 'path';

const POKE_DB_PATH = path.join(process.cwd(), 'data', 'pokedb.json');
const DROP_STATE = {
    timers: new Map(),
    activeDrops: new Map() // groupJid => { messageId, pokemonName, claimed }
};

const pokemons = [
    { name: 'Bulbasaur', id: 1 }, { name: 'Charmander', id: 4 }, { name: 'Squirtle', id: 7 },
    { name: 'Pikachu', id: 25 }, { name: 'Vulpix', id: 37 }, { name: 'Jigglypuff', id: 39 },
    { name: 'Meowth', id: 52 }, { name: 'Psyduck', id: 54 }, { name: 'Machop', id: 66 },
    { name: 'Gastly', id: 92 }, { name: 'Snorlax', id: 143 }, { name: 'Mewtwo', id: 150 }
];

async function loadDb() {
    if (!(await fs.pathExists(POKE_DB_PATH))) return {};
    return await fs.readJson(POKE_DB_PATH);
}

async function saveDb(db) {
    await fs.writeJson(POKE_DB_PATH, db, { spaces: 2 });
}

function normalize(jid = '') {
    return String(jid).replace(/@s\.whatsapp\.net|@c\.us|@lid|:\d+/g, '').replace(/[^0-9]/g, '');
}

function resolveIncomingParticipant(incomingMessage) {
    const key = incomingMessage?.key || {};
    const context = incomingMessage?.message?.extendedTextMessage?.contextInfo
        || incomingMessage?.message?.imageMessage?.contextInfo
        || incomingMessage?.message?.videoMessage?.contextInfo
        || null;
    return key.participant || context?.participant || key.remoteJid || '';
}

async function sendDrop(sock, groupJid) {
    const poke = pokemons[Math.floor(Math.random() * pokemons.length)];
    const image = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png`;
    const sent = await sock.sendMessage(groupJid, {
        image: { url: image },
        caption: 'A wild Pokémon appeared! 🤩\n\nReply to THIS message with the exact Pokémon name to catch it first!'
    });

    DROP_STATE.activeDrops.set(groupJid, {
        messageId: sent.key.id,
        pokemonName: poke.name.toLowerCase(),
        claimed: false
    });

    if (!global.replyHandlers) global.replyHandlers = {};
    global.replyHandlers[sent.key.id] = {
        command: 'pokemonhunt',
        handler: async (replyText, replyMessage) => {
            const state = DROP_STATE.activeDrops.get(groupJid);
            if (!state || state.claimed) return;
            const guess = String(replyText || '').trim().toLowerCase();
            if (!guess || guess !== state.pokemonName) return;

            state.claimed = true;
            const sender = resolveIncomingParticipant(replyMessage);
            const senderNum = normalize(sender);
            if (!senderNum) return;

            const db = await loadDb();
            if (!db[groupJid]) db[groupJid] = { users: {}, usdata: {} };
            if (!db[groupJid].usdata[senderNum]) db[groupJid].usdata[senderNum] = [];
            db[groupJid].usdata[senderNum].push(state.pokemonName);
            await saveDb(db);

            delete global.replyHandlers[sent.key.id];
            DROP_STATE.activeDrops.delete(groupJid);

            await sock.sendMessage(groupJid, {
                text: `🎉 @${senderNum} caught *${state.pokemonName.toUpperCase()}*!\n\nUse .pokemonhunt list to see your collection.`,
                mentions: [`${senderNum}@s.whatsapp.net`]
            }, { quoted: replyMessage });
        }
    };
}

export default {
    name: 'pokemonhunt',
    aliases: ['pokehunt', 'poke'],
    category: 'games',
    description: 'Start hourly pokemon drops, stop, or list collection',
    usage: 'pokemonhunt <start|stop|list>',
    cooldown: 4,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isOwner, isSudo }) {
        if (!isGroup) {
            return await sock.sendMessage(from, { text: '❌ pokemonhunt is group-only.' }, { quoted: message });
        }

        const action = (args[0] || '').toLowerCase();
        if (!['start', 'stop', 'list'].includes(action)) {
            return await sock.sendMessage(from, { text: 'Use: .pokemonhunt <start|stop|list>' }, { quoted: message });
        }

        if (action === 'list') {
            const db = await loadDb();
            const n = normalize(sender);
            const list = db?.[from]?.usdata?.[n] || [];
            if (!list.length) {
                return await sock.sendMessage(from, { text: '📭 You have no Pokémon yet. Join the hunt!' }, { quoted: message });
            }
            return await sock.sendMessage(from, {
                text: `📘 *Your Pokémon List*\n\nTotal: ${list.length}\n${list.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
            }, { quoted: message });
        }

        if (!isGroupAdmin && !isOwner && !isSudo) {
            return await sock.sendMessage(from, { text: '❌ Only group admins/owners can start or stop pokemonhunt.' }, { quoted: message });
        }

        if (action === 'start') {
            if (DROP_STATE.timers.has(from)) {
                return await sock.sendMessage(from, { text: 'ℹ️ Pokémon hunt is already active in this group.' }, { quoted: message });
            }

            await sendDrop(sock, from);
            const timer = setInterval(() => sendDrop(sock, from).catch(() => {}), 60 * 60 * 1000);
            DROP_STATE.timers.set(from, timer);
            return await sock.sendMessage(from, { text: '✅ Pokémon hunt started. A Pokémon will drop every 1 hour.' }, { quoted: message });
        }

        const timer = DROP_STATE.timers.get(from);
        if (timer) clearInterval(timer);
        DROP_STATE.timers.delete(from);
        DROP_STATE.activeDrops.delete(from);
        return await sock.sendMessage(from, { text: '🛑 Pokémon hunt stopped for this group.' }, { quoted: message });
    }
};
