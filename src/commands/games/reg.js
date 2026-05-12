import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage, registerFont } from '@napi-rs/canvas';
import axios from 'axios';

const DB = path.join(process.cwd(), 'data', 'registered_users.json');
function load(){ try{return JSON.parse(fs.readFileSync(DB,'utf8'));}catch{return [];} }
function save(data){ fs.mkdirSync(path.dirname(DB),{recursive:true}); fs.writeFileSync(DB, JSON.stringify(data,null,2)); }

async function generateRegCard(sock, userJid, name, age, sn, userNumber) {
    const canvas = createCanvas(600, 400);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    // Border
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 560, 360);

    // Title
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✅ REGISTRATION CARD', 300, 60);

    // Try to get user's profile picture
    let profileImg = null;
    try {
        const ppUrl = await sock.profilePictureUrl(userJid, 'image');
        const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 10000 });
        profileImg = await loadImage(Buffer.from(res.data));
    } catch {}

    // Draw profile picture
    if (profileImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(300, 160, 60, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(profileImg, 240, 100, 120, 120);
        ctx.restore();
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(300, 160, 60, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(300, 160, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👤', 300, 180);
    }

    // Details
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';

    const details = [
        { label: 'Name', value: name },
        { label: 'Age', value: age + ' Years' },
        { label: 'Serial No', value: sn },
        { label: 'User #', value: userNumber.toString() },
        { label: 'Status', value: 'ACTIVE' },
    ];

    let y = 250;
    details.forEach(d => {
        ctx.fillStyle = '#8899aa';
        ctx.font = '14px sans-serif';
        ctx.fillText(d.label.toUpperCase(), 180, y);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(d.value, 180, y + 22);
        y += 50;
    });

    // Footer
    ctx.fillStyle = '#667788';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Registration Date: ' + new Date().toLocaleDateString(), 300, 385);

    return canvas.toBuffer('image/png');
}

export default {
    name: 'reg',
    aliases: ['register'],
    category: 'games',
    description: 'Register with your name and age, get a registration card',
    usage: 'reg Name.Age',
    cooldown: 5,

    async execute({ sock, message, from, args, sender }) {
        const input = args.join(' ').trim();
        const m = input.match(/^([^\.]+)\.(\d{1,2})$/);
        if (!m) return sock.sendMessage(from, { text: 'Usage: .reg Name.Age\nExample: .reg Omegatech.50' }, { quoted: message });

        const name = m[1].trim();
        const age = Number(m[2]);
        if (!name) return sock.sendMessage(from, { text: '❌ Name cannot be empty.' }, { quoted: message });
        if (age < 1 || age > 50) return sock.sendMessage(from, { text: '❌ Age must be between 1 and 50.' }, { quoted: message });

        const users = load();
        if (users.some(u => u.jid === sender)) return sock.sendMessage(from, { text: '✅ You are already registered.' }, { quoted: message });

        const sn = crypto.randomBytes(8).toString('hex');
        users.push({ jid: sender, name, age, sn, createdAt: Date.now() });
        save(users);

        // Generate image card
        try {
            const imgBuffer = await generateRegCard(sock, sender, name, age, sn, users.length);
            await sock.sendMessage(from, {
                image: imgBuffer,
                caption: `✅ *Registered!* You are user #${users.length}\n👤 ${name} | 🎂 ${age} yrs | 🔑 ${sn}`
            }, { quoted: message });
        } catch (e) {
            // Fallback to text
            await sock.sendMessage(from, {
                text: `*✅ REGISTRATION SUCCESSFUL*\n\n👤 *Name:* ${name}\n🎂 *Age:* ${age} Years\n🔑 *SN:* ${sn}\n📊 *User #${users.length}*\n\n_Registration card image failed to generate._`
            }, { quoted: message });
        }
    }
};
