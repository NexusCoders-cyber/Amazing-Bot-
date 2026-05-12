const openings = ['Are you', 'If you were', 'I must be', 'You must be', 'Can I call you', 'Is your name'];
const subjects = ['magic', 'a star', 'my favorite song', 'wifi', 'a sunrise', 'a treasure map', 'a keyboard', 'a cloud', 'a playlist', 'a spark'];
const closings = [
    'because my day starts when you smile.',
    'because you just fixed my bad mood.',
    'because every room gets brighter with you in it.',
    'because I lose track of everything else.',
    'because my heart says “saved successfully.”',
    'because this feels like my favorite chapter.',
    'because that was the plot twist I needed.',
    'because your vibe is unmatched.',
    'because that should be illegal levels of cute.',
    'because now I forgot my pickup line.'
];

const PICKUP_LINES = [];
for (let i = 0; i < 50; i += 1) {
    for (const a of openings) {
        for (const b of subjects) {
            const c = closings[(i + b.length + a.length) % closings.length];
            PICKUP_LINES.push(`${a} ${b}? ${c}`);
            if (PICKUP_LINES.length >= 500) break;
        }
        if (PICKUP_LINES.length >= 500) break;
    }
    if (PICKUP_LINES.length >= 500) break;
}

export default {
    name: 'line',
    aliases: ['pickup', 'flirt', 'pickupline'],
    category: 'fun',
    description: 'Get a random pickup line (offline 500 lines)',
    usage: 'line',
    cooldown: 3,

    async execute({ sock, message, from, prefix }) {
        const line = PICKUP_LINES[Math.floor(Math.random() * PICKUP_LINES.length)] || 'You look amazing today.';
        await sock.sendMessage(from, {
            text: `😘 Pickup Line

${line}

💡 Use ${prefix}line for another one.`
        }, { quoted: message });
    }
};
