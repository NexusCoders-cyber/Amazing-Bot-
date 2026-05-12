import axios from 'axios';

const langCache = {};

export function setUserLangCache(jid, lang) {
    if (lang && lang !== 'en') langCache[jid] = lang;
    else delete langCache[jid];
}

export function getUserLangCache(jid) {
    return langCache[jid] || null;
}

export async function translateText(text, targetLang) {
    if (!text || !targetLang || targetLang === 'en') return text;
    try {
        const { data } = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.slice(0, 4000))}`, { timeout: 10000 });
        if (data?.[0]) return data[0].map(s => s[0]).join('');
    } catch {}
    return text;
}

export function enableAutoTranslate(sock) {
    const originalSend = sock.sendMessage.bind(sock);
    
    sock.sendMessage = async function(jid, content, options) {
        try {
            if (content?.text) {
                const opts = options || {};
                // For group replies, get the quoted participant
                const targetJid = String(jid).endsWith('@g.us')
                    ? opts?.quoted?.key?.participant || null
                    : jid;
                
                const lang = targetJid ? langCache[targetJid] : null;
                if (lang && lang !== 'en') {
                    const translated = await translateText(content.text, lang);
                    if (translated) content.text = translated;
                }
            }
        } catch {}
        
        return originalSend(jid, content, options);
    };
    
    return sock;
}
