import ky from 'ky';
import { createCanvas, loadImage } from '@napi-rs/canvas';

function nFormatter(num) {
    const n = Number(num || 0);
    if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, '')}G`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    return String(n);
}

async function stalkTikTok(username) {
    const solver = await ky
        .get('https://omegatech-api.dixonomega.tech/api/tools/cf-bypass', {
            searchParams: {
                url: 'https://www.anonymous-viewer.com',
                siteKey: '0x4AAAAAABNbm8zfrpvm5sRD',
                type: 'turnstile-min'
            },
            timeout: 30000
        })
        .json();

    if (!solver?.success || !solver?.result?.token) {
        throw new Error('Cloudflare Handshake Failed.');
    }

    const data = await ky
        .get('https://www.anonymous-viewer.com/api/tiktok/display', {
            searchParams: { username },
            headers: {
                accept: '*/*',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10)',
                'x-turnstile-token': solver.result.token,
                referer: `https://www.anonymous-viewer.com/tiktok/${username}`
            },
            timeout: 30000
        })
        .json();

    return data;
}

async function buildDossier(info, stats) {
    const width = 1000;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#020205';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0, 210, 255, 0.1)';
    for (let i = 0; i < width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }

    ctx.fillStyle = '#00d2ff';
    ctx.fillRect(0, 0, width, 80);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TIKTOK INTELLIGENCE DOSSIER', width / 2, 55);

    let pfp;
    try {
        pfp = await loadImage(info.avatarLarger || info.avatarThumb);
    } catch {
        pfp = await loadImage('https://telegra.ph/file/24167bc30c0f9cc20079b.jpg');
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(180, 250, 110, 0, Math.PI * 2);
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(pfp, 70, 140, 220, 220);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 45px sans-serif';
    ctx.fillText(info.nickname || info.uniqueId, 330, 170);

    ctx.fillStyle = '#00d2ff';
    ctx.font = '22px monospace';
    ctx.fillText(`@${info.uniqueId}`, 330, 205);

    const drawStat = (label, value, x, y) => {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y, 200, 80);

        ctx.fillStyle = '#00d2ff';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(nFormatter(value), x + 20, y + 40);

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px sans-serif';
        ctx.fillText(label.toUpperCase(), x + 20, y + 65);
    };

    drawStat('Followers', stats.followerCount, 330, 240);
    drawStat('Following', stats.followingCount, 550, 240);
    drawStat('Hearts', stats.heartCount, 770, 240);
    drawStat('Videos', stats.videoCount, 330, 340);

    ctx.fillStyle = '#fff';
    ctx.font = 'italic 18px sans-serif';
    const bio = info.signature || 'No signature provided.';
    const safeBio = bio.length > 60 ? `${bio.slice(0, 60)}...` : bio;
    ctx.fillText(`BIO: ${safeBio}`, 330, 460);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('LADY-TRISH INTELLIGENCE • POWERED BY OMEGATECH', width / 2, 560);

    return canvas.toBuffer('image/png');
}

export default {
    name: 'tikstalk',
    aliases: ['ttstalk', 'tiktokstalk'],
    category: 'utility',
    description: 'TikTok stalk with profile dossier card',
    usage: 'tikstalk <username>',
    example: 'tikstalk khaby.lame',
    cooldown: 7,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const input = args.join(' ').trim();
        if (!input) {
            return await sock.sendMessage(from, {
                text: '⚠️ Input Required\nExample: .tikstalk khaby.lame'
            }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '🔍', key: message.key } });
        await sock.sendMessage(from, {
            text: '✨ Lady-Trish Crawler: Bypassing Cloudflare and extracting user metadata...'
        }, { quoted: message });

        try {
            const username = input.replace('@', '');
            const res = await stalkTikTok(username);
            const info = res?.profile?.userInfo?.user;
            const stats = res?.profile?.userInfo?.stats;
            const latestPost = res?.posts?.originalItems?.[0];

            if (!info || !stats) {
                throw new Error('Subject not found in TikTok database.');
            }

            const buffer = await buildDossier(info, stats);

            let caption =
                `👤 TIKTOK PROFILE STALKED\n\n` +
                `📌 Name: ${info.nickname || 'Unknown'}\n` +
                `🆔 Username: @${info.uniqueId || username}\n` +
                `👥 Followers: ${Number(stats.followerCount || 0).toLocaleString()}\n` +
                `❤️ Total Likes: ${Number(stats.heartCount || 0).toLocaleString()}\n` +
                `🎬 Posts: ${Number(stats.videoCount || 0).toLocaleString()}\n` +
                `📖 Signature: ${info.signature || 'No Bio'}\n` +
                `🔗 Profile Link: https://www.tiktok.com/@${info.uniqueId || username}`;

            if (latestPost?.stats) {
                caption +=
                    `\n\n📺 Latest Video Info:\n` +
                    `📝 Caption: ${latestPost.desc || 'No description'}\n` +
                    `📊 Views: ${Number(latestPost.stats.playCount || 0).toLocaleString()}\n` +
                    `💬 Comments: ${Number(latestPost.stats.commentCount || 0).toLocaleString()}`;
            }

            await sock.sendMessage(from, { image: buffer, caption }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error(error);
            await sock.sendMessage(from, {
                text: `❌ Stalk Failed: ${error.message || String(error)}\n\nNote: API or solver might be down.`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};
