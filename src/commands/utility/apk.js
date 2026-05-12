export default {
    name: 'apk',
    category: 'utility',
    description: 'APK finder helper',
    usage: 'apk <app name>',
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const query = args.join(' ').trim();
        await sock.sendMessage(from, {
            text: `📦 APK Search\n\nQuery: ${query}\n\nTip: use trusted sources and scan files before installing.`
        }, { quoted: message });
    }
};
