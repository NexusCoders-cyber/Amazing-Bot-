export default {
    name: 'reactch',
    aliases: ['channelreact', 'chreact', 'channelreaction'],
    category: 'fun',
    description: 'React to channel posts, follow/unfollow channels',
    usage: 'reactch <action> [args]',
    cooldown: 5,
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args, prefix }) {
        const sub = args[0]?.toLowerCase();

        // reactch react <channel_link> <emoji>
        if (sub === 'react' || sub === 'r') {
            const link = args[1];
            const emoji = args[2] || '👍';

            if (!link) {
                return await sock.sendMessage(from, {
                    text: `❌ Usage: ${prefix}reactch react <channel_link> <emoji>\n` +
                          `Example: ${prefix}reactch react https://whatsapp.com/channel/0029Vb7MzHT1SWt0T3G06p0M ❤️`
                }, { quoted: message });
            }

            // Extract channel ID from link
            let channelId = link;
            // Handle https://whatsapp.com/channel/XXXXX format
            const linkMatch = link.match(/channel\/([A-Za-z0-9]+)/);
            if (linkMatch) {
                channelId = linkMatch[1] + '@newsletter';
            } else if (!link.includes('@newsletter')) {
                channelId = link + '@newsletter';
            }

            try {
                // First, try to follow the channel so we can react
                try {
                    if (typeof sock.newsletterFollow === 'function') {
                        await sock.newsletterFollow(channelId);
                    }
                } catch {}

                // Get channel updates/messages
                let updates;
                try {
                    if (typeof sock.newsletterUpdate === 'function') {
                        updates = await sock.newsletterUpdate(channelId);
                    }
                } catch {}

                // Try to send reaction to channel
                try {
                    await sock.sendMessage(channelId, {
                        react: { text: emoji, key: { remoteJid: channelId, id: 'latest', fromMe: false } }
                    });
                    return await sock.sendMessage(from, {
                        text: `✅ Reacted with ${emoji} on channel.\n📢 Channel: ${channelId}`
                    }, { quoted: message });
                } catch (e) {
                    // Alternative: try newsletterReaction
                    try {
                        if (typeof sock.newsletterReaction === 'function') {
                            await sock.newsletterReaction(channelId, 'latest', emoji);
                            return await sock.sendMessage(from, {
                                text: `✅ Reacted with ${emoji} on channel.`
                            }, { quoted: message });
                        }
                    } catch {}
                    throw e;
                }
            } catch (e) {
                return await sock.sendMessage(from, {
                    text: `❌ Failed to react: ${e.message}\n\nMake sure the bot is following the channel first.\nTry: ${prefix}reactch follow <link>`
                }, { quoted: message });
            }
        }

        // reactch follow <channel_link>
        if (sub === 'follow' || sub === 'f' || sub === 'join') {
            const link = args[1];
            if (!link) return await sock.sendMessage(from, { text: `❌ Usage: ${prefix}reactch follow <channel_link>` }, { quoted: message });

            let channelId = link;
            const linkMatch = link.match(/channel\/([A-Za-z0-9]+)/);
            if (linkMatch) channelId = linkMatch[1] + '@newsletter';
            else if (!link.includes('@newsletter')) channelId = link + '@newsletter';

            try {
                if (typeof sock.newsletterFollow !== 'function') {
                    return await sock.sendMessage(from, { text: '❌ This bot version does not support following channels.' }, { quoted: message });
                }
                await sock.newsletterFollow(channelId);
                return await sock.sendMessage(from, { text: `✅ Bot is now following the channel.` }, { quoted: message });
            } catch (e) {
                return await sock.sendMessage(from, { text: `❌ Failed to follow: ${e.message}` }, { quoted: message });
            }
        }

        // reactch unfollow <channel_link>
        if (sub === 'unfollow' || sub === 'uf' || sub === 'leave') {
            const link = args[1];
            if (!link) return await sock.sendMessage(from, { text: `❌ Usage: ${prefix}reactch unfollow <channel_link>` }, { quoted: message });

            let channelId = link;
            const linkMatch = link.match(/channel\/([A-Za-z0-9]+)/);
            if (linkMatch) channelId = linkMatch[1] + '@newsletter';
            else if (!link.includes('@newsletter')) channelId = link + '@newsletter';

            try {
                if (typeof sock.newsletterUnfollow !== 'function') {
                    return await sock.sendMessage(from, { text: '❌ Unfollow not supported.' }, { quoted: message });
                }
                await sock.newsletterUnfollow(channelId);
                return await sock.sendMessage(from, { text: `✅ Bot unfollowed the channel.` }, { quoted: message });
            } catch (e) {
                return await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: message });
            }
        }

        // reactch send <channel_link> <message>
        if (sub === 'send' || sub === 's' || sub === 'msg') {
            const link = args[1];
            const text = args.slice(2).join(' ').trim();
            if (!link || !text) return await sock.sendMessage(from, { text: `❌ Usage: ${prefix}reactch send <channel_link> <message>` }, { quoted: message });

            let channelId = link;
            const linkMatch = link.match(/channel\/([A-Za-z0-9]+)/);
            if (linkMatch) channelId = linkMatch[1] + '@newsletter';
            else if (!link.includes('@newsletter')) channelId = link + '@newsletter';

            try {
                await sock.sendMessage(channelId, { text });
                return await sock.sendMessage(from, { text: `✅ Message sent to channel.` }, { quoted: message });
            } catch (e) {
                return await sock.sendMessage(from, { text: `❌ ${e.message}` }, { quoted: message });
            }
        }

        // Default: show help
        const text = `📢 *Channel Commands*\n\n` +
            `${prefix}reactch follow <link> — follow channel\n` +
            `${prefix}reactch unfollow <link> — unfollow\n` +
            `${prefix}reactch react <link> <emoji> — react to channel\n` +
            `${prefix}reactch send <link> <text> — send message to channel\n\n` +
            `*Examples:*\n` +
            `${prefix}reactch follow https://whatsapp.com/channel/0029Vb7MzHT1SWt0T3G06p0M\n` +
            `${prefix}reactch react https://whatsapp.com/channel/0029Vb7MzHT1SWt0T3G06p0M ❤️\n` +
            `${prefix}reactch send https://whatsapp.com/channel/0029Vb7MzHT1SWt0T3G06p0M Hello!`;

        await sock.sendMessage(from, { text }, { quoted: message });
    }
};
