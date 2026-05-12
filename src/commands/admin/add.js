const ADD_DELAY = 3000;
const BATCH_SIZE = 10;
const BATCH_PAUSE = 10000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNumbers(args = []) {
    return args
        .join(' ')
        .split(/[\s,]+/)
        .map((n) => n.replace(/[^0-9]/g, ''))
        .filter((n) => n.length >= 10 && !n.startsWith('0'));
}

export default {
    name: 'copymem',
    aliases: ['add', 'invite'],
    category: 'admin',
    description: 'Bulk add members to the group with anti-ban delay',
    usage: 'copymem <num1> <num2> ...',
    example: 'copymem 2347085663318 2348012345678',
    cooldown: 3,
    permissions: ['admin'],
    args: true,
    minArgs: 1,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from }) {
        const reply = async (text) => sock.sendMessage(from, { text }, { quoted: message });

        try {
            const nums = [...new Set(parseNumbers(args))];
            if (!nums.length) {
                return await reply('❌ Provide valid international numbers (no leading 0).');
            }

            const MAX_TOTAL = BATCH_SIZE * 3;
            if (nums.length > MAX_TOTAL) {
                return await reply(`*「 ORELIA 」*\n\n❌ Too many numbers at once. Max per command: *${MAX_TOTAL}*.`);
            }

            await reply(
                `*「 ORELIA 」*\n\n`
                + `🚀 *Bulk Add Started*\n`
                + `${'─'.repeat(30)}\n`
                + `👥 Members to add : *${nums.length}*\n`
                + `⏱ Delay per add  : *${ADD_DELAY / 1000}s*\n`
                + `🔄 Batch cooldown : *${BATCH_PAUSE / 1000}s* every *${BATCH_SIZE}* adds\n\n`
                + '_Please wait..._'
            );

            let added = 0;
            let failed = 0;
            let skipped = 0;
            const failList = [];

            for (let i = 0; i < nums.length; i += 1) {
                const jid = `${nums[i]}@s.whatsapp.net`;
                const status = await sock.groupParticipantsUpdate(from, [jid], 'add')
                    .then((r) => String(r?.[0]?.status || ''))
                    .catch(() => 'error');

                if (status === '200') {
                    added += 1;
                } else if (status === '409') {
                    skipped += 1;
                } else {
                    failed += 1;
                    failList.push(`${nums[i]} (${status === 'error' ? '❌' : status})`);
                }

                if (i < nums.length - 1) await sleep(ADD_DELAY);

                if ((i + 1) % BATCH_SIZE === 0 && i < nums.length - 1) {
                    await reply(
                        `*「 ORELIA 」*\n\n`
                        + `⏳ *Batch ${Math.ceil((i + 1) / BATCH_SIZE)} complete*\n`
                        + `Processed: ${i + 1}/${nums.length}\n\n`
                        + `😴 Cooling down *${BATCH_PAUSE / 1000}s* to avoid ban...`
                    );
                    await sleep(BATCH_PAUSE);
                }
            }

            let report
                = `*「 ORELIA 」*\n\n`
                + '✅ *Bulk Add Complete!*\n'
                + `${'═'.repeat(30)}\n`
                + '📊 *Summary*\n'
                + `• Total Processed : ${nums.length}\n`
                + `• ✅ Added        : ${added}\n`
                + `• ⚠️ Already in   : ${skipped}\n`
                + `• ❌ Failed       : ${failed}\n`;

            if (failList.length) {
                report += `\n*Failed Numbers:*\n${failList.slice(0, 20).map((f) => `• ${f}`).join('\n')}`;
                if (failList.length > 20) report += `\n_...and ${failList.length - 20} more_`;
            }

            await reply(report);
        } catch (error) {
            await reply(`❌ Bulk add failed: ${error.message}`);
        }
    }
};
