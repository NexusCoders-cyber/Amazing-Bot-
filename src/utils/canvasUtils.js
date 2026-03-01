import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';

async function fetchImage(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
        return await loadImage(Buffer.from(res.data));
    } catch {
        return null;
    }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function circleClip(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
}

async function buildCard({ title, subtitle, label, avatarUrl, bgColor, accentColor }) {
    const W = 700, H = 220;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    drawRoundedRect(ctx, 8, 8, W - 16, H - 16, 16);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const avatarX = 110, avatarY = H / 2, radius = 72;
    ctx.save();
    circleClip(ctx, avatarX, avatarY, radius);
    let avatarDrawn = false;
    if (avatarUrl) {
        const img = await fetchImage(avatarUrl);
        if (img) {
            ctx.drawImage(img, avatarX - radius, avatarY - radius, radius * 2, radius * 2);
            avatarDrawn = true;
        }
    }
    if (!avatarDrawn) {
        const ag = ctx.createRadialGradient(avatarX, avatarY, 0, avatarX, avatarY, radius);
        ag.addColorStop(0, accentColor);
        ag.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = ag;
        ctx.fillRect(avatarX - radius, avatarY - radius, radius * 2, radius * 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 52px Sans';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((subtitle[0] || '?').toUpperCase(), avatarX, avatarY);
    }
    ctx.restore();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    const tx = 220;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 22px Sans';
    ctx.fillText(label, tx, 72);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px Sans';
    const maxW = W - tx - 30;
    let name = subtitle;
    while (ctx.measureText(name).width > maxW && name.length > 4) name = name.slice(0, -1);
    if (name !== subtitle) name += '...';
    ctx.fillText(name, tx, 118);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '18px Sans';
    ctx.fillText(title, tx, 158);

    return canvas.toBuffer('image/png');
}

export async function createPromoteImage(userName, groupName, authorName) {
    try {
        return await buildCard({
            title: `Promoted by +${authorName} in ${groupName}`,
            subtitle: `+${userName}`,
            label: 'New Group Admin',
            avatarUrl: null,
            bgColor: '#1a2a1a',
            accentColor: '#4ade80'
        });
    } catch { return null; }
}

export async function createDemoteImage(userName, groupName, authorName) {
    try {
        return await buildCard({
            title: `Demoted by +${authorName} in ${groupName}`,
            subtitle: `+${userName}`,
            label: 'Removed as Admin',
            avatarUrl: null,
            bgColor: '#2a1a1a',
            accentColor: '#f87171'
        });
    } catch { return null; }
}
