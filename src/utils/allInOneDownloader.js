import axios from 'axios';

const RAPID_API_URL = 'https://all-in-one-vidoe-downloader.p.rapidapi.com/download';
const RAPID_API_HOST = 'all-in-one-vidoe-downloader.p.rapidapi.com';
const RAPID_API_KEY = process.env.RAPID_API_KEY || '';

function firstNonEmpty(...items) {
    for (const it of items) {
        if (typeof it === 'string' && it.trim()) return it.trim();
    }
    return '';
}

function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
}

export function pickBestMedia(data = {}, prefer = 'video') {
    const candidates = [
        data?.download, data?.url, data?.link,
        data?.result?.download, data?.result?.url, data?.result?.link,
        data?.data?.download, data?.data?.url, data?.data?.link,
        data?.audio, data?.video,
        data?.result?.audio, data?.result?.video,
        data?.data?.audio, data?.data?.video,
        data?.direct, data?.result?.direct, data?.data?.direct
    ];

    const nestedList = [
        ...asArray(data?.media),
        ...asArray(data?.result?.media),
        ...asArray(data?.data?.media),
        ...asArray(data?.formats),
        ...asArray(data?.result?.formats),
        ...asArray(data?.data?.formats)
    ];

    for (const row of nestedList) {
        if (!row || typeof row !== 'object') continue;
        const byType = prefer === 'audio'
            ? firstNonEmpty(row.audio, row.audioUrl, row.url)
            : firstNonEmpty(row.video, row.videoUrl, row.url);
        if (byType) return byType;
        const generic = firstNonEmpty(row.download, row.link, row.url, row.file);
        if (generic) candidates.push(generic);
    }

    const flatCandidates = [];
    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            for (const item of candidate) {
                if (typeof item === 'string') flatCandidates.push(item);
                else if (item && typeof item === 'object') {
                    flatCandidates.push(firstNonEmpty(item.url, item.link, item.video, item.audio, item.download));
                }
            }
            continue;
        }
        flatCandidates.push(candidate);
    }

    return firstNonEmpty(...flatCandidates);
}

export function parseAllInOneMeta(payload = {}) {
    const data = payload?.data || payload?.result || payload;
    return {
        title: firstNonEmpty(data?.title, data?.name, data?.result?.title) || 'Unknown title',
        artist: firstNonEmpty(data?.artist, data?.author, data?.uploader, data?.channel) || 'Unknown artist',
        duration: firstNonEmpty(data?.duration, data?.timestamp, data?.length) || 'Unknown',
        thumbnail: firstNonEmpty(data?.thumbnail, data?.thumb, data?.image, data?.cover, data?.result?.thumbnail, data?.result?.thumb),
        sourceUrl: firstNonEmpty(data?.source, data?.url, data?.link)
    };
}

export async function fetchAllInOneDownload(url) {
    if (!RAPID_API_KEY) throw new Error('Missing RAPID_API_KEY');
    const { data } = await axios.get(RAPID_API_URL, {
        params: { url },
        timeout: 45000,
        headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-host': RAPID_API_HOST,
            'x-rapidapi-key': RAPID_API_KEY
        }
    });
    return data;
}

export async function fetchAllInOneFallback(url) {
    const { data } = await axios.get('https://dev-priyanshi.onrender.com/api/alldl', {
        params: { url },
        timeout: 45000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return data?.data || data?.result || data;
}
