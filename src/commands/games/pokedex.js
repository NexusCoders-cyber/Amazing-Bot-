import fs from 'fs-extra';

import path from 'path';

const POKE_DB_PATH = path.join(process.cwd(), 'data', 'pokedb.json');

function resolveTarget(message, sender) {
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    const mentioned = ctx?.mentionedJid || [];
    return mentioned[0] || sender;
}

function pickName(threadData, targetJid) {
    const shortId = targetJid.split('@')[0];
    const profile = threadData?.users?.[shortId] || threadData?.users?.[targetJid];
    if (profile?.name) return profile.name;
    return shortId;
}

export default {
    name: 'pokedex',
    aliases: ['pokelist'],
    category: 'games',
    description: 'View your Pokémon list or mentioned user list',
    usage: 'pokedex [@user]',
    example: 'pokedex @user',
    cooldown: 5,
    permissions: ['user'],
    groupOnly: true,

    async execute({ sock, message, sender, from }) {
        try {
            const exists = await fs.pathExists(POKE_DB_PATH);
            if (!exists) {
                await fs.ensureDir(path.dirname(POKE_DB_PATH));
                await fs.writeJson(POKE_DB_PATH, {}, { spaces: 2 });
            }

            const pokedb = await fs.readJson(POKE_DB_PATH);
            const threadData = pokedb?.[from];
            if (!threadData) {
                await sock.sendMessage(from, { text: "This thread hasn’t started pokebot yet." }, { quoted: message });
                return;
            }

            const targetJid = resolveTarget(message, sender);
            const shortId = targetJid.split('@')[0];
            const list = threadData?.usdata?.[shortId] || threadData?.usdata?.[targetJid] || [];

            if (!Array.isArray(list) || !list.length) {
                const name = pickName(threadData, targetJid);
                await sock.sendMessage(from, { text: `BAKA!! ${name} doesn't have any pokemons yet.` }, { quoted: message });
                return;
            }

            const name = pickName(threadData, targetJid);
            const text = [
                '╭「Pokemon Masters Candidate」',
                '│_',
                `❏ User id: ${shortId}`,
                `❏ Name: ${name}`,
                `❏ Pokemons: ${list.length}`,
                `↬ ${list.join('\n↬ ').toUpperCase()}`
            ].join('\n');

            await sock.sendMessage(from, { text }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: '🥺 server busy' }, { quoted: message });
        }
    }
};
