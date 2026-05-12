import axios from 'axios';

export async function handleGroupJoin(sock, groupJid, participantJids, groupMetadata) {
    try {
        const meta = groupMetadata || await sock.groupMetadata(groupJid).catch(() => null);
        if (!meta) return;
        const gcName = meta.subject || 'Group';
        const gcDesc = meta.desc || '';
        const gcSize = meta.participants?.length || 0;

        for (const jid of participantJids) {
            try {
                const name = await sock.getName(jid).catch(() => jid.split('@')[0]);
                let ppUrl = null;
                try { ppUrl = await sock.profilePictureUrl(jid, 'image'); } catch {}

                const msg = `👋 *Welcome!*\n\n${name} joined *${gcName}*\n👥 Members: ${gcSize}\n📝 ${gcDesc || 'No description'}\n\n🎉 Enjoy your stay!`;

                if (ppUrl) {
                    const img = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 10000 }).catch(() => null);
                    if (img) {
                        await sock.sendMessage(groupJid, {
                            image: Buffer.from(img.data),
                            caption: msg,
                            mentions: [jid]
                        });
                    } else {
                        await sock.sendMessage(groupJid, { text: msg, mentions: [jid] });
                    }
                } else {
                    await sock.sendMessage(groupJid, { text: msg, mentions: [jid] });
                }
            } catch {}
        }
    } catch {}
}

export async function handleGroupLeave(sock, groupJid, participantJids, groupMetadata) {
    try {
        const meta = groupMetadata || await sock.groupMetadata(groupJid).catch(() => null);
        if (!meta) return;
        const gcName = meta.subject || 'Group';
        const gcSize = meta.participants?.length || 0;

        for (const jid of participantJids) {
            try {
                const name = await sock.getName(jid).catch(() => jid.split('@')[0]);
                let ppUrl = null;
                try { ppUrl = await sock.profilePictureUrl(jid, 'image'); } catch {}

                const msg = `😢 *Goodbye!*\n\n${name} left *${gcName}*\n👥 Remaining: ${gcSize}\n\nWe'll miss you!`;

                if (ppUrl) {
                    const img = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 10000 }).catch(() => null);
                    if (img) {
                        await sock.sendMessage(groupJid, {
                            image: Buffer.from(img.data),
                            caption: msg,
                            mentions: [jid]
                        });
                    } else {
                        await sock.sendMessage(groupJid, { text: msg, mentions: [jid] });
                    }
                } else {
                    await sock.sendMessage(groupJid, { text: msg, mentions: [jid] });
                }
            } catch {}
        }
    } catch {}
}
