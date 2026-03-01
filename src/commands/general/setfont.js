import { FONT_NAMES, FONT_ALIASES, FONT_PREVIEWS, applyFont, resolveFont, isValidFont } from '../../utils/fontManager.js';
import { setUserFont, setGlobalFont, getUserFont, getGlobalFont, resetUserFont, resetGlobalFont, getAllFontUsers } from '../../utils/fontStorage.js';

export default {
    name: 'setfont',
    aliases: ['font'],
    category: 'general',
    description: 'Change the font style of all bot messages',
    usage: 'setfont <font|list|preview|reset|global [font]>',
    example: 'setfont bold\nsetfont list\nsetfont preview boldscript\nsetfont reset\nsetfont global bolditalic',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,

    async execute({ sock, message, from, sender, args, prefix, isOwner, isSudo }) {

        if (!args.length) {
            const currentGlobal = await getGlobalFont();
            const currentUser = await getUserFont(sender);
            const active = currentGlobal !== 'normal' ? `${currentGlobal} (global)` : currentUser;

            const text = [
                applyFont('Font System', 'boldscript'),
                '',
                `Active font: ${applyFont(active, active.replace(' (global)', ''))}`,
                '',
                applyFont('Available commands:', 'bold'),
                `${prefix}setfont list         — see all fonts with previews`,
                `${prefix}setfont <name>       — set your personal font`,
                `${prefix}setfont preview <name>  — preview a font`,
                `${prefix}setfont reset        — reset your font to normal`,
                isOwner || isSudo ? `${prefix}setfont global <name>  — set font for ALL users` : '',
                isOwner || isSudo ? `${prefix}setfont global reset    — reset global font` : '',
                '',
                applyFont('Quick aliases:', 'bold'),
                'b=bold  i=italic  bi=bolditalic  bs=boldscript',
                's=script  f=fraktur  m=monospace  sc=smallcaps',
                'c=circled  fw=fullwidth  n=normal/reset'
            ].filter(l => l !== undefined).join('\n');

            return await sock.sendMessage(from, { text }, { quoted: message });
        }

        const sub = args[0].toLowerCase();

        if (sub === 'list' || sub === 'all') {
            const globalFont = await getGlobalFont();
            const userFont = await getUserFont(sender);

            let text = applyFont('All Available Fonts', 'boldscript') + '\n\n';
            text += `Global: ${globalFont !== 'normal' ? applyFont(globalFont, globalFont) : 'normal'}\n`;
            text += `Your font: ${applyFont(userFont, userFont)}\n\n`;

            for (const name of FONT_NAMES) {
                const preview = FONT_PREVIEWS[name];
                const isActive = (globalFont !== 'normal' && globalFont === name) || (globalFont === 'normal' && userFont === name);
                const marker = isActive ? ' ◀ active' : '';
                text += `${applyFont(name, name)}\n${preview}${marker}\n\n`;
            }

            text += `${prefix}setfont <name> to apply`;
            return await sock.sendMessage(from, { text }, { quoted: message });
        }

        if (sub === 'preview') {
            const target = args[1]?.toLowerCase();
            if (!target) {
                return await sock.sendMessage(from, {
                    text: `Specify a font to preview.\nExample: ${prefix}setfont preview boldscript`
                }, { quoted: message });
            }
            const resolved = resolveFont(target);
            if (!resolved || !FONT_PREVIEWS[resolved]) {
                return await sock.sendMessage(from, {
                    text: `Unknown font "${target}".\nType ${prefix}setfont list to see all fonts.`
                }, { quoted: message });
            }

            const sample = 'The quick brown fox jumps over the lazy dog 0123456789';
            const text = [
                applyFont(`Font Preview: ${resolved}`, 'bold'),
                '',
                applyFont(sample, resolved),
                '',
                applyFont('ABCDEFGHIJKLMNOPQRSTUVWXYZ', resolved),
                applyFont('abcdefghijklmnopqrstuvwxyz', resolved),
                '',
                `${prefix}setfont ${resolved} to apply this font`
            ].join('\n');

            return await sock.sendMessage(from, { text }, { quoted: message });
        }

        if (sub === 'reset' || sub === 'off' || sub === 'normal' || sub === 'default') {
            await resetUserFont(sender);
            const sample = applyFont('Font reset to normal. All messages will look like this.', 'normal');
            return await sock.sendMessage(from, { text: sample }, { quoted: message });
        }

        if (sub === 'global') {
            if (!isOwner && !isSudo) {
                return await sock.sendMessage(from, {
                    text: 'Only the bot owner can set the global font.'
                }, { quoted: message });
            }

            const target = args[1]?.toLowerCase();

            if (!target || target === 'reset' || target === 'off' || target === 'normal') {
                await resetGlobalFont();
                return await sock.sendMessage(from, {
                    text: 'Global font reset. Each user now uses their own font setting.'
                }, { quoted: message });
            }

            const resolved = resolveFont(target);
            if (!resolved || resolved === 'normal') {
                return await sock.sendMessage(from, {
                    text: `Unknown font "${target}".\nType ${prefix}setfont list to see all fonts.`
                }, { quoted: message });
            }

            await setGlobalFont(resolved);

            const preview = applyFont(`Global font set to ${resolved}. Every bot message now looks like this!`, resolved);
            return await sock.sendMessage(from, { text: preview }, { quoted: message });
        }

        if (sub === 'stats' || sub === 'users') {
            if (!isOwner && !isSudo) {
                return await sock.sendMessage(from, {
                    text: 'Only the bot owner can view font stats.'
                }, { quoted: message });
            }

            const users = await getAllFontUsers();
            const globalFont = await getGlobalFont();

            let text = applyFont('Font Statistics', 'bold') + '\n\n';
            text += `Global font: ${globalFont !== 'normal' ? applyFont(globalFont, globalFont) : 'normal'}\n`;
            text += `Users with custom fonts: ${users.length}\n\n`;

            if (users.length > 0) {
                for (const u of users.slice(0, 20)) {
                    const num = (u.id || u._id || '').split('@')[0];
                    text += `${num}: ${applyFont(u.font, u.font)}\n`;
                }
                if (users.length > 20) text += `...and ${users.length - 20} more`;
            }

            return await sock.sendMessage(from, { text }, { quoted: message });
        }

        const fontName = sub;
        const resolved = resolveFont(fontName);

        if (!resolved) {
            const close = FONT_NAMES.filter(n => n.startsWith(fontName[0])).slice(0, 3);
            let response = `Unknown font "${fontName}".`;
            if (close.length) response += `\n\nDid you mean: ${close.join(', ')}`;
            response += `\n\nType ${prefix}setfont list to see all fonts.`;
            return await sock.sendMessage(from, { text: response }, { quoted: message });
        }

        if (resolved === 'normal') {
            await resetUserFont(sender);
            return await sock.sendMessage(from, {
                text: 'Font reset to normal.'
            }, { quoted: message });
        }

        await setUserFont(sender, resolved);

        const preview = FONT_PREVIEWS[resolved];
        const lines = [
            applyFont(`Font set to ${resolved}!`, resolved),
            '',
            applyFont('All bot messages will now look like this.', resolved),
            '',
            preview,
            '',
            `Type ${prefix}setfont list to browse all fonts`,
            `Type ${prefix}setfont reset to go back to normal`
        ].join('\n');

        await sock.sendMessage(from, { text: lines }, { quoted: message });
    }
};
