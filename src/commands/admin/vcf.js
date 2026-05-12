function escapeVcf(value = '') {
    return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function buildContactCard({ fullName, number, whatsappId, index }) {
    const safeName = escapeVcf(fullName || `Member ${index}`);
    const tel = `+${number}`;
    return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:;${safeName};;;`,
        `FN:${safeName}`,
        `TEL;TYPE=CELL:${tel}`,
        `NOTE:WhatsApp: ${escapeVcf(whatsappId)}`,
        'END:VCARD'
    ].join('\n');
}

export default {
    name: 'vcf',
    aliases: ['gcvcf', 'contacts'],
    category: 'admin',
    description: 'Export all group participants as a .vcf contacts file',
    usage: 'vcf',
    cooldown: 10,
    groupOnly: true,
    adminOnly: true,
    permissions: ['admin'],

    async execute({ sock, message, from, isGroup, isGroupAdmin }) {
        if (!isGroup) {
            return sock.sendMessage(from, { text: '❌ This command works in groups only.' }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return sock.sendMessage(from, { text: '❌ Only group admins can export contacts.' }, { quoted: message });
        }

        try {
            const meta = await sock.groupMetadata(from);
            const participants = meta?.participants || [];
            if (!participants.length) {
                return sock.sendMessage(from, { text: '❌ No participants found in this group.' }, { quoted: message });
            }

            const cards = [];
            let idx = 1;
            for (const participant of participants) {
                const jid = participant.id || '';
                const number = jid.split('@')[0]?.replace(/\D/g, '');
                if (!number) continue;
                let waName = participant.notify || participant.name || participant.vname || participant.pushName || '';
                if (!waName && typeof sock.getName === 'function') {
                    try { waName = await sock.getName(jid); } catch {}
                }
                cards.push(buildContactCard({
                    fullName: waName || `+${number}`,
                    number,
                    whatsappId: jid,
                    index: idx
                }));
                idx += 1;
            }

            const fileName = `${(meta.subject || 'group').replace(/[^a-z0-9_-]/gi, '_')}_contacts.vcf`;
            const vcfContent = cards.join('\n');
            await sock.sendMessage(from, {
                document: Buffer.from(vcfContent, 'utf8'),
                fileName,
                mimetype: 'text/vcard',
                caption: `✅ Exported ${cards.length} contacts from "${meta.subject}".`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed to generate VCF: ${error.message}` }, { quoted: message });
        }
    }
};
