const FONTS = {
    normal: null,

    bold: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇'.split(/(?<=\p{L})/u),
        upperMap: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭'.split(/(?<=\p{L})/u),
        digits: '0123456789'.split(''),
        digitMap: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'.split(/(?<=\p{N})/u)
    },

    italic: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻'.split(/(?<=\p{L})/u),
        upperMap: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡'.split(/(?<=\p{L})/u)
    },

    bolditalic: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯'.split(/(?<=\p{L})/u),
        upperMap: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕'.split(/(?<=\p{L})/u)
    },

    script: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏'.split(/(?<=\p{L})/u),
        upperMap: '𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵'.split(/(?<=\p{L})/u)
    },

    boldscript: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃'.split(/(?<=\p{L})/u),
        upperMap: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩'.split(/(?<=\p{L})/u)
    },

    fraktur: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷'.split(/(?<=\p{L})/u),
        upperMap: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ'.split(/(?<=\p{L})/u)
    },

    boldfraktur: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟'.split(/(?<=\p{L})/u),
        upperMap: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅'.split(/(?<=\p{L})/u)
    },

    doublestruck: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫'.split(/(?<=\p{L})/u),
        upperMap: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ'.split(/(?<=\p{L})/u),
        digits: '0123456789'.split(''),
        digitMap: '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡'.split(/(?<=\p{N})/u)
    },

    sans: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓'.split(/(?<=\p{L})/u),
        upperMap: '𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹'.split(/(?<=\p{L})/u)
    },

    sansbold: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇'.split(/(?<=\p{L})/u),
        upperMap: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭'.split(/(?<=\p{L})/u),
        digits: '0123456789'.split(''),
        digitMap: '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'.split(/(?<=\p{N})/u)
    },

    sansitalic: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻'.split(/(?<=\p{L})/u),
        upperMap: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡'.split(/(?<=\p{L})/u)
    },

    sansbolditalic: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯'.split(/(?<=\p{L})/u),
        upperMap: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕'.split(/(?<=\p{L})/u)
    },

    monospace: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣'.split(/(?<=\p{L})/u),
        upperMap: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉'.split(/(?<=\p{L})/u),
        digits: '0123456789'.split(''),
        digitMap: '𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿'.split(/(?<=\p{N})/u)
    },

    smallcaps: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        lowerMap: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ'.split('')
    },

    circled: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ'.split(''),
        upperMap: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ'.split(''),
        digits: '0123456789'.split(''),
        digitMap: '⓪①②③④⑤⑥⑦⑧⑨'.split('')
    },

    fullwidth: {
        lower: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        lowerMap: 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ'.split(''),
        upperMap: 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ'.split(''),
        digits: '0123456789'.split(''),
        digitMap: '０１２３４５６７８９'.split('')
    }
};

export const FONT_NAMES = Object.keys(FONTS);

export const FONT_ALIASES = {
    'b': 'bold',
    'i': 'italic',
    'bi': 'bolditalic',
    's': 'script',
    'bs': 'boldscript',
    'f': 'fraktur',
    'bf': 'boldfraktur',
    'ds': 'doublestruck',
    'ss': 'sans',
    'sb': 'sansbold',
    'si': 'sansitalic',
    'sbi': 'sansbolditalic',
    'm': 'monospace',
    'mono': 'monospace',
    'sc': 'smallcaps',
    'caps': 'smallcaps',
    'c': 'circled',
    'fw': 'fullwidth',
    'wide': 'fullwidth',
    'n': 'normal',
    'off': 'normal',
    'reset': 'normal',
    'default': 'normal'
};

export const FONT_PREVIEWS = {
    normal:        'Normal text stays as-is',
    bold:          '𝗛𝗲𝗹𝗹𝗼 𝗪𝗼𝗿𝗹𝗱 𝟭𝟮𝟯',
    italic:        '𝘏𝘦𝘭𝘭𝘰 𝘞𝘰𝘳𝘭𝘥',
    bolditalic:    '𝙃𝙚𝙡𝙡𝙤 𝙒𝙤𝙧𝙡𝙙',
    script:        '𝒽𝑒𝓁𝓁𝑜 𝒲𝑜𝓇𝓁𝒹',
    boldscript:    '𝓗𝓮𝓵𝓵𝓸 𝓦𝓸𝓻𝓵𝓭',
    fraktur:       '𝔥𝔢𝔩𝔩𝔬 𝔚𝔬𝔯𝔩𝔡',
    boldfraktur:   '𝖍𝖊𝖑𝖑𝖔 𝖂𝖔𝖗𝖑𝖉',
    doublestruck:  '𝕙𝕖𝕝𝕝𝕠 𝕎𝕠𝕣𝕝𝕕 𝟘𝟙𝟚',
    sans:          '𝗁𝖾𝗅𝗅𝗈 𝖶𝗈𝗋𝗅𝖽',
    sansbold:      '𝗵𝗲𝗹𝗹𝗼 𝗪𝗼𝗿𝗹𝗱 𝟭𝟮𝟯',
    sansitalic:    '𝘩𝘦𝘭𝘭𝘰 𝘞𝘰𝘳𝘭𝘥',
    sansbolditalic:'𝙝𝙚𝙡𝙡𝙤 𝙒𝙤𝙧𝙡𝙙',
    monospace:     '𝚑𝚎𝚕𝚕𝚘 𝚆𝚘𝚛𝚕𝚍 𝟶𝟷𝟸',
    smallcaps:     'ʜᴇʟʟᴏ ᴡᴏʀʟᴅ',
    circled:       'ⓗⓔⓛⓛⓞ ⓦⓞⓡⓛⓓ ①②③',
    fullwidth:     'ｈｅｌｌｏ Ｗｏｒｌｄ １２３'
};

function convertChar(char, font) {
    const li = font.lower?.indexOf(char);
    if (li !== -1 && li !== undefined && font.lowerMap?.[li]) return font.lowerMap[li];

    const ui = font.upper?.indexOf(char);
    if (ui !== -1 && ui !== undefined && font.upperMap?.[ui]) return font.upperMap[ui];

    if (font.digits && font.digitMap) {
        const di = font.digits.indexOf(char);
        if (di !== -1) return font.digitMap[di];
    }

    return char;
}

export function applyFont(text, fontName) {
    if (!fontName || fontName === 'normal') return text;

    const resolved = FONT_ALIASES[fontName] || fontName;
    const font = FONTS[resolved];
    if (!font) return text;

    return text.split('').map(c => convertChar(c, font)).join('');
}

export function resolveFont(name) {
    if (!name) return null;
    const lower = name.toLowerCase();
    if (lower === 'normal' || lower === 'off' || lower === 'reset' || lower === 'default') return 'normal';
    return FONT_ALIASES[lower] || (FONTS[lower] !== undefined ? lower : null);
}

export function isValidFont(name) {
    return resolveFont(name) !== null;
}

export function listFonts() {
    return FONT_NAMES;
}
