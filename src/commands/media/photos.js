import axios from 'axios';

function parseCount(raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1) return 5;
    return Math.min(n, 10);
}

async function searchDDGImages(query, limit) {
    const images = [];
    const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
        const tokenRes = await axios.get('https://duckduckgo.com/', {
            params: { q: query },
            headers: { 'User-Agent': ua, 'Accept': 'text/html' },
            timeout: 10000
        });
        const vqdMatch = tokenRes.data.match(/vqd=([^"&]+)/);
        const vqd = vqdMatch?.[1];

        if (vqd) {
            const { data: imgData } = await axios.get('https://duckduckgo.com/i.js', {
                params: { q: query, vqd, o: 'json', f: ',,,' },
                headers: { 'User-Agent': ua, 'Referer': 'https://duckduckgo.com/' },
                timeout: 15000
            });
            if (imgData?.results) {
                for (const r of imgData.results) {
                    if (images.length >= limit) break;
                    const url = r.image || r.thumbnail;
                    if (url) images.push(url);
                }
            }
        }
    } catch {}

    if (images.length < limit) {
        try {
            const { data } = await axios.get('https://www.bing.com/images/search', {
                params: { q: query, qft: '+filterui:photo-photo' },
                headers: { 'User-Agent': ua, 'Accept': 'text/html' },
                timeout: 10000
            });
            const matches = data.matchAll(/src="(https?:\/\/[^"]+?\.(?:jpg|jpeg|png|webp)[^"]*)"/gi);
            for (const m of matches) {
                if (images.length >= limit) break;
                const u = m[1].replace(/&amp;/g, '&');
                if (u && !images.includes(u)) images.push(u);
            }
        } catch {}
    }

    return [...new Set(images)].slice(0, limit);
}

async function downloadImage(url, retries = 2) {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const referrers = [
        'https://duckduckgo.com/',
        'https://www.google.com/',
        'https://www.bing.com/',
        'https://www.pinterest.com/'
    ];

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const resp = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: {
                    'User-Agent': ua,
                    'Referer': referrers[attempt] || 'https://www.google.com/',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });
            return Buffer.from(resp.data);
        } catch {
            if (attempt < retries) await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
}

export default {
    name: 'photos',
    aliases: ['imagesearch', 'imgsearch', 'searchimg'],
    category: 'media',
    description: 'Search and send HD images from the web',
    usage: 'photos <query> [count]',
    cooldown: 8,
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const count = parseCount(args[args.length - 1]);
        const keyword = Number.isNaN(Number.parseInt(args[args.length - 1], 10))
            ? args.join(' ').trim()
            : args.slice(0, -1).join(' ').trim();

        if (!keyword) {
            return await sock.sendMessage(from, {
                text: '❌ Usage: `.photos <keyword> [count]`\nMax: 10 images'
            }, { quoted: message });
        }

        const images = await searchDDGImages(keyword, count);

        if (!images.length) {
            return await sock.sendMessage(from, {
                text: '❌ No images found.'
            }, { quoted: message });
        }

        // Download all images in parallel first
        const downloadResults = await Promise.allSettled(
            images.map(url => downloadImage(url))
        );

        const validBuffers = downloadResults
            .map((r, i) => ({ buf: r.status === 'fulfilled' ? r.value : null, idx: i }))
            .filter(({ buf }) => buf && buf.length >= 1024);

        if (!validBuffers.length) {
            return await sock.sendMessage(from, {
                text: '❌ Could not download images.'
            }, { quoted: message });
        }

        // Send all images at once
        const caption = `📸 *${keyword}* — ${validBuffers.length} images`;
        await Promise.all(
            validBuffers.map(({ buf }) =>
                sock.sendMessage(from, { image: buf, caption }, { quoted: message })
            )
        );
    }
};
