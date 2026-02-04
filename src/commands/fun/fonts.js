import font from '../../utils/font.js';

export default {
    name: 'fonts',
    aliases: ['fontstyle', 'textstyle'],
    category: 'fun',
    description: 'Convert text to different Unicode font styles',
    usage: 'fonts <style> <text>',
    example: 'fonts bold Hello World\nfonts list',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, sender }) {
        if (args.length === 0 || args[0].toLowerCase() === 'list') {
            const stylesList = `🎨 *Available Font Styles*

${font.bold('Bold')} - fonts bold <text>
${font.italic('Italic')} - fonts italic <text>
${font.boldItalic('Bold Italic')} - fonts bolditalic <text>
${font.script('Script')} - fonts script <text>
${font.boldScript('Bold Script')} - fonts boldscript <text>
${font.fraktur('Fraktur')} - fonts fraktur <text>
${font.monospace('Monospace')} - fonts mono <text>
${font.sans('Sans')} - fonts sans <text>
${font.sansBold('Sans Bold')} - fonts sansbold <text>
${font.sansItalic('Sans Italic')} - fonts sansitalic <text>
${font.doubleStruck('Double Struck')} - fonts double <text>
${font.circled('Circled')} - fonts circled <text>
${font.circledNeg('Circled Negative')} - fonts circledneg <text>
${font.squared('Squared')} - fonts squared <text>
${font.squaredNeg('Squared Negative')} - fonts squaredneg <text>
${font.strikethrough('Strikethrough')} - fonts strike <text>
${font.underline('Underline')} - fonts underline <text>
${font.overline('Overline')} - fonts overline <text>
${font.bubble('Bubble Text')} - fonts bubble <text>
${font.superscript('Superscript')} - fonts super <text>
${font.subscript('Subscript')} - fonts sub <text>

💡 Example: fonts bold Hello World`;

            return await sock.sendMessage(from, {
                text: stylesList
            }, { quoted: message });
        }

        if (args.length < 2) {
            return await sock.sendMessage(from, {
                text: '❌ Usage: fonts <style> <text>\n\n💡 Type "fonts list" to see all styles'
            }, { quoted: message });
        }

        const style = args[0].toLowerCase();
        const text = args.slice(1).join(' ');

        const styleMap = {
            'bold': font.bold,
            'b': font.bold,
            'italic': font.italic,
            'i': font.italic,
            'bolditalic': font.boldItalic,
            'bi': font.boldItalic,
            'script': font.script,
            's': font.script,
            'boldscript': font.boldScript,
            'bs': font.boldScript,
            'fraktur': font.fraktur,
            'f': font.fraktur,
            'boldfraktur': font.boldFraktur,
            'bf': font.boldFraktur,
            'monospace': font.monospace,
            'mono': font.mono,
            'm': font.mono,
            'sans': font.sans,
            'sansbold': font.sansBold,
            'sb': font.sansBold,
            'sansitalic': font.sansItalic,
            'si': font.sansItalic,
            'sansbolditalic': font.sansBoldItalic,
            'sbi': font.sansBoldItalic,
            'doublestruck': font.doubleStruck,
            'double': font.doubleStruck,
            'd': font.doubleStruck,
            'circled': font.circled,
            'c': font.circled,
            'circledneg': font.circledNeg,
            'cn': font.circledNeg,
            'squared': font.squared,
            'sq': font.squared,
            'squaredneg': font.squaredNeg,
            'sqn': font.squaredNeg,
            'strikethrough': font.strikethrough,
            'strike': font.strike,
            'st': font.strike,
            'underline': font.underline,
            'u': font.underline,
            'overline': font.overline,
            'o': font.overline,
            'smallcaps': font.smallCaps,
            'sc': font.smallCaps,
            'bubble': font.bubble,
            'superscript': font.superscript,
            'super': font.super,
            'sup': font.super,
            'subscript': font.subscript,
            'sub': font.sub
        };

        const converter = styleMap[style];

        if (!converter) {
            return await sock.sendMessage(from, {
                text: `❌ Unknown style: ${style}\n\n💡 Type "fonts list" to see all available styles`
            }, { quoted: message });
        }

        const converted = converter(text);

        await sock.sendMessage(from, {
            text: converted
        }, { quoted: message });
    }
};
