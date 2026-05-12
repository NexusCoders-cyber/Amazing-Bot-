import axios from 'axios';
import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import tls from 'tls';
import { URL } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import vm from 'vm';

const execFileAsync = promisify(execFile);

function normalizeUrl(input) {
    const raw = String(input || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
}

function quotedText(message) {
    const q = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    return q?.conversation || q?.extendedTextMessage?.text || q?.imageMessage?.caption || '';
}

function parseHost(input) {
    const raw = String(input || '').trim();
    if (!raw) return '';
    try {
        return new URL(normalizeUrl(raw)).hostname;
    } catch {
        return raw.replace(/^https?:\/\//i, '').split('/')[0];
    }
}

function shortJson(v, max = 3200) {
    const t = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    return t.length > max ? `${t.slice(0, max)}\n...truncated...` : t;
}

function base64UrlDecode(segment) {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
}

async function tcpCheck(host, port, timeout = 1200) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let done = false;
        const end = (open) => {
            if (done) return;
            done = true;
            socket.destroy();
            resolve(open);
        };
        socket.setTimeout(timeout);
        socket.once('connect', () => end(true));
        socket.once('timeout', () => end(false));
        socket.once('error', () => end(false));
        socket.connect(port, host);
    });
}

export const LAB_TOOL_META = {
    scrape: 'scrape <url> — scrape text from webpage',
    whois: 'whois <domain> — whois lookup',
    dns: 'dns <domain> — A/MX/TXT/CNAME/NS lookup',
    ipinfo: 'ipinfo <ip|domain> — geo + ASN',
    headers: 'headers <url> — response headers',
    webstatus: 'webstatus <url> — up/down check',
    ssl: 'ssl <domain> — cert details/expiry',
    jwt: 'jwt <token> — decode JWT',
    b64: 'b64 <enc|dec> <text> — base64 tools',
    hash: 'hash <md5|sha1|sha256|sha512> <text> — hash text',
    jsonformat: 'jsonformat <json> — validate & prettify',
    regex: 'regex <pattern> | <text> — test regex',
    portscan: 'portscan <host> [ports] — scan ports',
    netping: 'netping <host> — latency check',
    curl: 'curl <method> <url> [jsonBody] — HTTP request',
    hosting: 'hosting <domain> — hosting/NS/IP info',
    pageinfo: 'pageinfo <url> — title/meta/og tags',
    robots: 'robots <domain> — fetch robots.txt',
    sitemap: 'sitemap <domain> — fetch sitemap.xml',
    techstack: 'techstack <url> — detect stack hints',
    urlshort: 'urlshort <url> — shorten URL',
    qrgen: 'qrgen <text> — generate QR image',
    urlencode: 'urlencode <enc|dec> <text> — URL transform',
    colorconvert: 'colorconvert <hex|rgb:r,g,b> — color convert',
    minify: 'minify <html|css|js> <code> — minify snippet',
    timestamp: 'timestamp [unix] — unix/human converter',
    uuid: 'uuid [count] — generate UUID v4',
    passgen: 'passgen [length] — random password',
    cron: 'cron <expr> — explain cron expression',
    myip: 'myip — server public IP',
    apitest: 'apitest <method> <url> [jsonBody] — endpoint test',
    domainavail: 'domainavail <domain> — domain availability hint',
    subdomains: 'subdomains <domain> — crt.sh subdomains',
    coderun: 'coderun <js|python|bash> <code> — run code sandboxed',
    lorem: 'lorem [words] — lorem ipsum text'
};

export async function runLabTool(name, input, ctx = {}) {
    const tool = String(name || '').toLowerCase();
    const value = String(input || '').trim();

    switch (tool) {
    case 'scrape': {
        const url = normalizeUrl(value);
        const { data } = await axios.get(url, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const text = String(data).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return `🕷️ Scrape\nURL: ${url}\n\n${text.slice(0, 3500) || 'No text extracted.'}`;
    }
    case 'whois': {
        const { data } = await axios.get(`https://api.whois.vu/?q=${encodeURIComponent(value)}`, { timeout: 25000 });
        return `🔍 WHOIS\n\n${shortJson(data)}`;
    }
    case 'dns': {
        const host = parseHost(value);
        const [a, mx, txt, cname, ns] = await Promise.all([
            dns.resolve4(host).catch(() => []),
            dns.resolveMx(host).catch(() => []),
            dns.resolveTxt(host).catch(() => []),
            dns.resolveCname(host).catch(() => []),
            dns.resolveNs(host).catch(() => [])
        ]);
        return [`🌐 DNS for ${host}`, `A: ${a.join(', ') || 'none'}`, `MX: ${mx.map((m) => `${m.exchange}:${m.priority}`).join(', ') || 'none'}`, `TXT: ${txt.flat().join(' | ') || 'none'}`, `CNAME: ${cname.join(', ') || 'none'}`, `NS: ${ns.join(', ') || 'none'}`].join('\n');
    }
    case 'ipinfo': {
        const host = parseHost(value);
        const { data } = await axios.get(`https://ipwho.is/${encodeURIComponent(host)}`, { timeout: 25000 });
        return `🗺️ IP Info\n\n${shortJson(data)}`;
    }
    case 'headers': {
        const url = normalizeUrl(value);
        const res = await axios.get(url, { timeout: 25000, validateStatus: () => true });
        return `📋 Headers (${res.status})\n\n${Object.entries(res.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}`;
    }
    case 'webstatus': {
        const url = normalizeUrl(value);
        const start = Date.now();
        const res = await axios.get(url, { timeout: 20000, validateStatus: () => true });
        return `📡 Web Status\nURL: ${url}\nStatus: ${res.status}\nLatency: ${Date.now() - start}ms`;
    }
    case 'ssl': {
        const host = parseHost(value);
        const cert = await new Promise((resolve, reject) => {
            const socket = tls.connect(443, host, { servername: host, rejectUnauthorized: false }, () => {
                const c = socket.getPeerCertificate();
                socket.end();
                resolve(c);
            });
            socket.setTimeout(10000, () => reject(new Error('SSL timeout')));
            socket.on('error', reject);
        });
        return [`🔒 SSL Certificate`, `Host: ${host}`, `Subject CN: ${cert.subject?.CN || 'N/A'}`, `Issuer CN: ${cert.issuer?.CN || 'N/A'}`, `Valid from: ${cert.valid_from || 'N/A'}`, `Valid to: ${cert.valid_to || 'N/A'}`].join('\n');
    }
    case 'jwt': {
        const [h, p, s] = value.split('.');
        if (!h || !p || !s) throw new Error('Invalid JWT format');
        return `🪙 JWT Decoded\n\nHeader:\n${shortJson(JSON.parse(base64UrlDecode(h)), 1200)}\n\nPayload:\n${shortJson(JSON.parse(base64UrlDecode(p)), 2000)}\n\nSignature: ${s.slice(0, 36)}...`;
    }
    case 'b64': {
        const [mode, ...rest] = value.split(' ');
        const text = rest.join(' ');
        if (/^dec/i.test(mode)) return `🔤 Base64 Decode\n\n${Buffer.from(text, 'base64').toString('utf8')}`;
        return `🔤 Base64 Encode\n\n${Buffer.from(text).toString('base64')}`;
    }
    case 'hash': {
        const [algoRaw, ...rest] = value.split(' ');
        const algo = String(algoRaw || '').toLowerCase();
        const allowed = ['md5', 'sha1', 'sha256', 'sha512'];
        if (!allowed.includes(algo)) throw new Error('Use hash <md5|sha1|sha256|sha512> <text>');
        return `#️⃣ ${algo.toUpperCase()}\n\n${crypto.createHash(algo).update(rest.join(' ')).digest('hex')}`;
    }
    case 'jsonformat': {
        const parsed = JSON.parse(value);
        return `📄 JSON OK\n\n${JSON.stringify(parsed, null, 2).slice(0, 3500)}`;
    }
    case 'regex': {
        const [pattern, text] = value.split('|').map((v) => v.trim());
        if (!pattern || text === undefined) throw new Error('Use regex <pattern> | <text>');
        const re = new RegExp(pattern);
        const m = text.match(re);
        return `🧩 Regex Result\nMatch: ${Boolean(m)}\n${m ? `Value: ${m[0]}` : ''}`;
    }
    case 'portscan': {
        const [hostRaw, portsRaw] = value.split(' ');
        const host = parseHost(hostRaw);
        const ports = portsRaw ? portsRaw.split(',').map((p) => Number(p.trim())).filter(Boolean) : [21, 22, 25, 53, 80, 110, 143, 443, 445, 3306, 5432, 6379, 8080, 8443];
        const checks = await Promise.all(ports.map(async (port) => ({ port, open: await tcpCheck(host, port) })));
        const open = checks.filter((c) => c.open).map((c) => c.port);
        return `🔌 Portscan ${host}\nOpen: ${open.join(', ') || 'none'}\nChecked: ${ports.join(', ')}`;
    }
    case 'netping': {
        const host = parseHost(value);
        const url = normalizeUrl(host);
        const start = Date.now();
        await axios.get(url, { timeout: 12000, validateStatus: () => true });
        return `🏓 Netping\nHost: ${host}\nLatency: ${Date.now() - start}ms`;
    }
    case 'curl':
    case 'apitest': {
        const [methodRaw, urlRaw, ...rest] = value.split(' ');
        const method = (methodRaw || 'GET').toUpperCase();
        const url = normalizeUrl(urlRaw);
        const bodyText = rest.join(' ').trim();
        let body;
        if (bodyText) {
            try { body = JSON.parse(bodyText); } catch { body = bodyText; }
        }
        const res = await axios({ method, url, data: body, timeout: 30000, validateStatus: () => true });
        return `📨 API ${method} ${url}\nStatus: ${res.status}\n\n${shortJson(res.data)}`;
    }
    case 'hosting': {
        const host = parseHost(value);
        const [ips, ns] = await Promise.all([dns.resolve4(host).catch(() => []), dns.resolveNs(host).catch(() => [])]);
        const ip = ips[0];
        const geo = ip ? await axios.get(`https://ipwho.is/${ip}`, { timeout: 15000 }).then((r) => r.data).catch(() => null) : null;
        return `🏠 Hosting\nDomain: ${host}\nIP: ${ip || 'N/A'}\nNS: ${ns.join(', ') || 'N/A'}\nISP: ${geo?.connection?.isp || 'N/A'}\nASN: ${geo?.connection?.asn || 'N/A'}`;
    }
    case 'pageinfo': {
        const url = normalizeUrl(value);
        const { data } = await axios.get(url, { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = String(data);
        const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || 'N/A';
        const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || 'N/A';
        const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] || 'N/A';
        const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] || 'N/A';
        return `🗒️ Page Info\nTitle: ${title}\nDescription: ${desc}\nOG Title: ${ogTitle}\nOG Description: ${ogDesc}`;
    }
    case 'robots': {
        const host = parseHost(value);
        const url = `https://${host}/robots.txt`;
        const { data } = await axios.get(url, { timeout: 20000 });
        return `🤖 robots.txt\n${url}\n\n${String(data).slice(0, 3300)}`;
    }
    case 'sitemap': {
        const host = parseHost(value);
        const url = `https://${host}/sitemap.xml`;
        const { data } = await axios.get(url, { timeout: 20000 });
        const matches = [...String(data).matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]).slice(0, 40);
        return `🗺️ Sitemap\n${url}\n\n${matches.join('\n') || String(data).slice(0, 3000)}`;
    }
    case 'techstack': {
        const url = normalizeUrl(value);
        const res = await axios.get(url, { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = String(res.data).toLowerCase();
        const headers = Object.fromEntries(Object.entries(res.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v).toLowerCase()]));
        const hints = [];
        if (html.includes('wp-content') || html.includes('wordpress')) hints.push('WordPress');
        if (html.includes('shopify') || headers['x-shopify-stage']) hints.push('Shopify');
        if (html.includes('__next') || html.includes('_next/')) hints.push('Next.js');
        if (html.includes('react')) hints.push('React');
        if (html.includes('vue')) hints.push('Vue');
        if (headers.server) hints.push(`Server: ${headers.server}`);
        if (headers['x-powered-by']) hints.push(`X-Powered-By: ${headers['x-powered-by']}`);
        if (headers['cf-ray'] || headers.server?.includes('cloudflare')) hints.push('Cloudflare CDN');
        return `🧱 Tech Stack\nURL: ${url}\n\n${hints.length ? hints.join('\n') : 'No strong fingerprints detected.'}`;
    }
    case 'urlshort': {
        const url = normalizeUrl(value);
        const { data } = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`, { timeout: 15000 });
        return `🔗 Short URL\n${String(data).trim()}`;
    }
    case 'qrgen': {
        const text = encodeURIComponent(value || 'ILOM MD BOT');
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${text}`;
        return { image: { url: qrUrl }, caption: `⬛ QR Generated\nText: ${decodeURIComponent(text).slice(0, 120)}` };
    }
    case 'urlencode': {
        const [mode, ...rest] = value.split(' ');
        const text = rest.join(' ');
        if (/^dec/i.test(mode)) return `🔏 URL Decode\n\n${decodeURIComponent(text)}`;
        return `🔏 URL Encode\n\n${encodeURIComponent(text)}`;
    }
    case 'colorconvert': {
        const raw = value.trim();
        if (/^#?[0-9a-f]{6}$/i.test(raw)) {
            const hex = raw.startsWith('#') ? raw : `#${raw}`;
            const n = Number.parseInt(hex.slice(1), 16);
            const r = (n >> 16) & 255; const g = (n >> 8) & 255; const b = n & 255;
            return `🎨 ${hex}\nRGB: ${r},${g},${b}`;
        }
        const rgb = raw.match(/^(?:rgb:)?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/i);
        if (!rgb) throw new Error('Use colorconvert <hex|rgb:r,g,b>');
        const r = Number(rgb[1]); const g = Number(rgb[2]); const b = Number(rgb[3]);
        const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
        return `🎨 RGB ${r},${g},${b}\nHEX: ${hex}`;
    }
    case 'minify': {
        const [kindRaw, ...rest] = value.split(' ');
        const kind = (kindRaw || '').toLowerCase();
        const code = rest.join(' ');
        if (!['html', 'css', 'js'].includes(kind)) throw new Error('Use minify <html|css|js> <code>');
        const out = code.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').replace(/\s*([{};:,=()<>+\-])\s*/g, '$1').trim();
        return `📦 Minified (${kind})\n\n${out.slice(0, 3500)}`;
    }
    case 'timestamp': {
        const t = value ? Number(value) : Math.floor(Date.now() / 1000);
        const ms = t > 1e12 ? t : t * 1000;
        return `⏱️ Timestamp\nUnix: ${Math.floor(ms / 1000)}\nISO: ${new Date(ms).toISOString()}\nLocal: ${new Date(ms).toString()}`;
    }
    case 'uuid': {
        const count = Math.max(1, Math.min(20, Number(value || '1')));
        return `🆔 UUID v4\n\n${Array.from({ length: count }, () => crypto.randomUUID()).join('\n')}`;
    }
    case 'passgen': {
        const len = Math.max(8, Math.min(128, Number(value || '16')));
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{}';
        let out = '';
        const bytes = crypto.randomBytes(len);
        for (let i = 0; i < len; i += 1) out += chars[bytes[i] % chars.length];
        return `🛡️ Password (${len})\n\n${out}`;
    }
    case 'cron': {
        const parts = value.split(/\s+/).filter(Boolean);
        if (parts.length < 5) throw new Error('Use cron <min hour day month weekday>');
        return `🕰️ Cron Explain\nExpression: ${parts.slice(0, 5).join(' ')}\nMeaning: minute=${parts[0]}, hour=${parts[1]}, day=${parts[2]}, month=${parts[3]}, weekday=${parts[4]}`;
    }
    case 'myip': {
        const { data } = await axios.get('https://api.ipify.org?format=json', { timeout: 10000 });
        return `🌍 Server Public IP\n${data?.ip || 'N/A'}`;
    }
    case 'domainavail': {
        const host = parseHost(value);
        const existing = await dns.resolveAny(host).then(() => true).catch(() => false);
        return `✅ Domain availability hint\nDomain: ${host}\nAvailable: ${existing ? 'Likely NO (DNS records found)' : 'Possibly YES (no DNS records found)'}`;
    }
    case 'subdomains': {
        const host = parseHost(value);
        const { data } = await axios.get(`https://crt.sh/?q=%25.${encodeURIComponent(host)}&output=json`, { timeout: 30000 });
        const names = [...new Set((Array.isArray(data) ? data : []).flatMap((d) => String(d.name_value || '').split('\n').map((n) => n.trim().toLowerCase())).filter((n) => n && !n.includes('*')).slice(0, 120))];
        return `🌲 Subdomains (${names.length})\n\n${names.slice(0, 80).join('\n') || 'No results'}`;
    }
    case 'coderun': {
        const [langRaw, ...rest] = value.split(' ');
        const lang = String(langRaw || '').toLowerCase();
        const code = rest.join(' ').trim();
        if (!code) throw new Error('Use coderun <js|python|bash> <code>');
        if (lang === 'js') {
            const sandbox = { output: '', console: { log: (...a) => { sandbox.output += `${a.join(' ')}\n`; } } };
            vm.createContext(sandbox);
            vm.runInContext(code, sandbox, { timeout: 1500 });
            return `▶️ JS Output\n\n${sandbox.output || 'Done (no output)'}`;
        }
        if (lang === 'python') {
            const { stdout, stderr } = await execFileAsync('python3', ['-c', code], { timeout: 2500, maxBuffer: 200 * 1024 });
            return `▶️ Python Output\n\n${(stdout || stderr || 'Done (no output)').slice(0, 3300)}`;
        }
        if (lang === 'bash') {
            const { stdout, stderr } = await execFileAsync('bash', ['-lc', code], { timeout: 2500, maxBuffer: 200 * 1024 });
            return `▶️ Bash Output\n\n${(stdout || stderr || 'Done (no output)').slice(0, 3300)}`;
        }
        throw new Error('Language must be js, python, or bash');
    }
    case 'lorem': {
        const words = Math.max(10, Math.min(500, Number(value || '80')));
        const base = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua';
        const arr = base.split(' ');
        const out = Array.from({ length: words }, (_, i) => arr[i % arr.length]).join(' ');
        return `📝 Lorem (${words} words)\n\n${out}`;
    }
    default:
        throw new Error('Unknown lab tool');
    }
}

export async function handleLabCommand(tool, ctx, opts = {}) {
    const { sock, message, args = [], from, prefix = '.' } = ctx;
    const input = args.join(' ').trim() || quotedText(message);
    const noInputTools = new Set(['uuid', 'myip', 'timestamp', 'lorem', 'passgen']);
    if (!input && !noInputTools.has(tool)) {
        const usage = LAB_TOOL_META[tool] || `${tool} <input>`;
        return sock.sendMessage(from, { text: `❌ Usage: ${prefix}${usage}` }, { quoted: message });
    }

    if (tool === 'coderun' && opts.ownerOnly && !opts.ownerOnly(ctx)) {
        return sock.sendMessage(from, { text: '❌ coderun is owner-only for safety.' }, { quoted: message });
    }

    try {
        const out = await runLabTool(tool, input, ctx);
        if (typeof out === 'object' && out?.image) {
            return sock.sendMessage(from, out, { quoted: message });
        }
        return sock.sendMessage(from, { text: String(out) }, { quoted: message });
    } catch (error) {
        return sock.sendMessage(from, { text: `❌ ${tool} failed: ${error.message}` }, { quoted: message });
    }
}
