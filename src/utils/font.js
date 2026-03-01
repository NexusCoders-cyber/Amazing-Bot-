const fontStyles = {
    bold: {
        upper: 0x1D400,
        lower: 0x1D41A,
        digit: 0x1D7CE
    },
    italic: {
        upper: 0x1D434,
        lower: 0x1D44E
    },
    boldItalic: {
        upper: 0x1D468,
        lower: 0x1D482
    },
    script: {
        upper: 0x1D49C,
        lower: 0x1D4B6,
        exceptions: {
            'B': '𝓑', 'E': '𝓔', 'F': '𝓕', 'H': '𝓗', 'I': '𝓘', 'L': '𝓛',
            'M': '𝓜', 'R': '𝓡', 'e': 'ℯ', 'g': 'ℊ', 'o': 'ℴ'
        }
    },
    boldScript: {
        upper: 0x1D4D0,
        lower: 0x1D4EA
    },
    fraktur: {
        upper: 0x1D504,
        lower: 0x1D51E,
        exceptions: {
            'C': 'ℭ', 'H': 'ℌ', 'I': 'ℑ', 'R': 'ℜ', 'Z': 'ℨ'
        }
    },
    boldFraktur: {
        upper: 0x1D56C,
        lower: 0x1D586
    },
    monospace: {
        upper: 0x1D670,
        lower: 0x1D68A,
        digit: 0x1D7F6
    },
    sans: {
        upper: 0x1D5A0,
        lower: 0x1D5BA,
        digit: 0x1D7E2
    },
    sansBold: {
        upper: 0x1D5D4,
        lower: 0x1D5EE,
        digit: 0x1D7EC
    },
    sansItalic: {
        upper: 0x1D608,
        lower: 0x1D622
    },
    sansBoldItalic: {
        upper: 0x1D63C,
        lower: 0x1D656
    },
    doubleStruck: {
        upper: 0x1D538,
        lower: 0x1D552,
        digit: 0x1D7D8,
        exceptions: {
            'C': 'ℂ', 'H': 'ℍ', 'N': 'ℕ', 'P': 'ℙ', 'Q': 'ℚ', 'R': 'ℝ', 'Z': 'ℤ'
        }
    }
};

const circledStyles = {
    circled: (char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x24B6 + (code - 65));
        if (code >= 97 && code <= 122) return String.fromCodePoint(0x24D0 + (code - 97));
        if (code >= 48 && code <= 57) {
            if (code === 48) return '⓪';
            return String.fromCodePoint(0x2460 + (code - 49));
        }
        return char;
    },
    circledNeg: (char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x1F150 + (code - 65));
        if (code >= 48 && code <= 57) {
            if (code === 48) return '⓿';
            return String.fromCodePoint(0x2776 + (code - 49));
        }
        return char;
    },
    squared: (char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x1F130 + (code - 65));
        return char;
    },
    squaredNeg: (char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x1F170 + (code - 65));
        return char;
    }
};

const specialStyles = {
    strikethrough: (text) => text.split('').map(c => c + '\u0336').join(''),
    underline: (text) => text.split('').map(c => c + '\u0332').join(''),
    overline: (text) => text.split('').map(c => c + '\u0305').join(''),
    smallCaps: (text) => {
        return text.split('').map(char => {
            const code = char.charCodeAt(0);
            if (code >= 97 && code <= 122) {
                return String.fromCodePoint(0x1D00 + (code - 97));
            }
            return char;
        }).join('');
    },
    bubbleText: (text) => {
        return text.split('').map(char => {
            const code = char.charCodeAt(0);
            if (code >= 65 && code <= 90) return String.fromCodePoint(0x24B6 + (code - 65));
            if (code >= 97 && code <= 122) return String.fromCodePoint(0x24D0 + (code - 97));
            if (code >= 48 && code <= 57) {
                if (code === 48) return '⓪';
                return String.fromCodePoint(0x2460 + (code - 49));
            }
            return char;
        }).join('');
    },
    superscript: (text) => {
        const map = {
            '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
            '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
            'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
            'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
            'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
            'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
            'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
            '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾'
        };
        return text.split('').map(c => map[c.toLowerCase()] || c).join('');
    },
    subscript: (text) => {
        const map = {
            '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
            '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
            'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
            'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
            'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
            'v': 'ᵥ', 'x': 'ₓ', '+': '₊', '-': '₋', '=': '₌',
            '(': '₍', ')': '₎'
        };
        return text.split('').map(c => map[c.toLowerCase()] || c).join('');
    }
};

function convertText(text, style) {
    if (!style || !style.upper) return text;

    return text.split('').map(char => {
        const code = char.charCodeAt(0);

        if (style.exceptions && style.exceptions[char]) {
            return style.exceptions[char];
        }

        if (code >= 65 && code <= 90) {
            return String.fromCodePoint(style.upper + (code - 65));
        }

        if (code >= 97 && code <= 122) {
            return String.fromCodePoint(style.lower + (code - 97));
        }

        if (style.digit && code >= 48 && code <= 57) {
            return String.fromCodePoint(style.digit + (code - 48));
        }

        return char;
    }).join('');
}

const font = {
    bold: (text) => convertText(text, fontStyles.bold),
    italic: (text) => convertText(text, fontStyles.italic),
    boldItalic: (text) => convertText(text, fontStyles.boldItalic),
    script: (text) => convertText(text, fontStyles.script),
    boldScript: (text) => convertText(text, fontStyles.boldScript),
    fraktur: (text) => convertText(text, fontStyles.fraktur),
    boldFraktur: (text) => convertText(text, fontStyles.boldFraktur),
    monospace: (text) => convertText(text, fontStyles.monospace),
    mono: (text) => convertText(text, fontStyles.monospace),
    sans: (text) => convertText(text, fontStyles.sans),
    sansBold: (text) => convertText(text, fontStyles.sansBold),
    sansItalic: (text) => convertText(text, fontStyles.sansItalic),
    sansBoldItalic: (text) => convertText(text, fontStyles.sansBoldItalic),
    doubleStruck: (text) => convertText(text, fontStyles.doubleStruck),
    circled: (text) => text.split('').map(circledStyles.circled).join(''),
    circledNeg: (text) => text.split('').map(circledStyles.circledNeg).join(''),
    squared: (text) => text.split('').map(circledStyles.squared).join(''),
    squaredNeg: (text) => text.split('').map(circledStyles.squaredNeg).join(''),
    strikethrough: (text) => specialStyles.strikethrough(text),
    strike: (text) => specialStyles.strikethrough(text),
    underline: (text) => specialStyles.underline(text),
    overline: (text) => specialStyles.overline(text),
    smallCaps: (text) => specialStyles.smallCaps(text),
    bubble: (text) => specialStyles.bubbleText(text),
    superscript: (text) => specialStyles.superscript(text),
    super: (text) => specialStyles.superscript(text),
    subscript: (text) => specialStyles.subscript(text),
    sub: (text) => specialStyles.subscript(text)
};

export default font;
