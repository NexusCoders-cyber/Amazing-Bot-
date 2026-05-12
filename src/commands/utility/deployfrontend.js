import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const FONTS_FILE = path.resolve(process.cwd(), 'fonts/fontmap.json');
const FONT_ID = 'small_caps';
const NEWSLETTER_JID = '120363421055682094@newsletter';
const NEWSLETTER_NAME = "DEVIL'S UPDATE CHANNEL";
const NEWSLETTER_MSG_ID = 281;
const QWEN_MODEL = 'qwen-max-latest';

const VERCEL_API = 'https://api.vercel.com';
const CF_API = 'https://api.cloudflare.com/client/v4';
const BASE_DOMAIN = 'devmalvryx.qzz.io';
const VERCEL_CNAME_TARGET = 'cname.vercel-dns.com';

const MAX_FILES = 10000;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const DEPLOY_TIMEOUT = 360000;
const DOMAIN_TIMEOUT = 240000;

const SKIP_DIRS = new Set(['.git', '__MACOSX', 'node_modules', '.svn', '.hg']);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db', '.env', '.env.local', '.env.production']);

const FRAMEWORKS = [
  { deps: ['next'], id: 'nextjs', label: 'Next.js' },
  { deps: ['nuxt', 'nuxt3'], id: 'nuxtjs', label: 'Nuxt.js' },
  { deps: ['gatsby'], id: 'gatsby', label: 'Gatsby' },
  { deps: ['@sveltejs/kit'], id: 'svelte-kit', label: 'SvelteKit' },
  { deps: ['astro'], id: 'astro', label: 'Astro' },
  { deps: ['@remix-run/dev'], id: 'remix', label: 'Remix' },
  { deps: ['react-scripts'], id: 'create-react-app', label: 'Create React App' },
  { deps: ['vite'], id: 'vite', label: 'Vite' },
  { deps: ['@vue/cli-service'], id: 'vue', label: 'Vue CLI' },
  { deps: ['@angular/core'], id: 'angular', label: 'Angular' },
  { deps: ['parcel', 'parcel-bundler'], id: null, label: 'Parcel (Static)' },
];

function loadFont(id = FONT_ID) {
  try {
    if (!fs.existsSync(FONTS_FILE)) return null;
    const d = JSON.parse(fs.readFileSync(FONTS_FILE, 'utf8'));
    return d?.fonts?.find((f) => f.id === id)?.map || null;
  } catch {
    return null;
  }
}

function sf(text, map) {
  if (!map) return String(text);
  return String(text).split('').map((c) => map[c] || map[c.toUpperCase()] || c).join('');
}

function ctxInfo(S) {
  return {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: NEWSLETTER_JID,
      serverMessageId: NEWSLETTER_MSG_ID,
      newsletterName: S(NEWSLETTER_NAME),
    },
  };
}

function banner(title, body, S) {
  return `*${S(title)}*\n─────────────────────\n${body}\n─────────────────────\n> ${S('Created by Dev Malvryx')}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function toProjectName(sub) {
  return `deploy-${sub}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-{2,}/g, '-').slice(0, 52);
}

function detectFramework(pkgJsonContent) {
  let pkg;
  try { pkg = JSON.parse(pkgJsonContent.toString('utf8')); } catch { return null; }
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  for (const fw of FRAMEWORKS) {
    if (fw.deps.some((d) => d in allDeps)) return { id: fw.id, label: fw.label, pkg };
  }
  return { id: null, label: 'Custom (package.json detected)', pkg };
}

function checkCompatibility(files) {
  const filesByPath = new Map(files.map((f) => [f.path.toLowerCase(), f]));
  const allPaths = [...filesByPath.keys()];
  const allExts = allPaths.map((p) => path.extname(p).toLowerCase());
  const hasIndexHtml = allPaths.some((p) => p === 'index.html' || p.endsWith('/index.html'));
  const hasPkgJson = filesByPath.has('package.json');
  const hasVercelJson = filesByPath.has('vercel.json');

  if (allExts.some((e) => e === '.php')) return { ok: false, reason: 'PHP files detected. Vercel does not support PHP.' };
  if (allExts.some((e) => e === '.rb') && !hasVercelJson) return { ok: false, reason: 'Ruby files detected. Vercel does not support Ruby apps.' };
  if (allExts.some((e) => ['.java', '.class', '.jar'].includes(e))) return { ok: false, reason: 'Java files detected. Vercel does not support Java apps.' };
  if (allExts.some((e) => ['.cs', '.csproj', '.sln'].includes(e))) return { ok: false, reason: '.NET files detected. Vercel does not support .NET apps.' };

  if (!hasIndexHtml && !hasPkgJson && !hasVercelJson) {
    return { ok: false, reason: 'No index.html, package.json, or vercel.json found at root.' };
  }

  let frameworkInfo = null;
  if (hasPkgJson) frameworkInfo = detectFramework(files.find((f) => f.path === 'package.json')?.content || Buffer.from(''));

  const hasDistIndex = allPaths.some((p) => p.startsWith('dist/') && p.endsWith('index.html'));
  const hasBuildIndex = allPaths.some((p) => p.startsWith('build/') && p.endsWith('index.html'));
  const hasOutIndex = allPaths.some((p) => p.startsWith('out/') && p.endsWith('index.html'));
  const isPrebuilt = hasDistIndex || hasBuildIndex || hasOutIndex;

  return {
    ok: true,
    isStatic: !hasPkgJson || isPrebuilt,
    isPrebuilt,
    framework: frameworkInfo?.id ?? null,
    frameworkLabel: frameworkInfo?.label ?? (hasIndexHtml ? 'Static HTML' : 'Static'),
    pkg: frameworkInfo?.pkg ?? null,
    hasPkgJson,
  };
}

async function qwenAsk(keys, prompt) {
  if (!keys?.length) return null;
  const pool = [...keys].sort(() => Math.random() - 0.5);
  for (const key of pool) {
    try {
      const res = await axios.post('https://qwen.aikit.club/v1/chat/completions', {
        model: QWEN_MODEL,
        messages: [
          { role: 'system', content: 'You are a concise deployment expert. Answer in 1-2 sentences.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
      }, {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        timeout: 25000,
        validateStatus: () => true,
      });
      if (res.status === 401 || res.status === 429) continue;
      const txt = res.data?.choices?.[0]?.message?.content;
      if (txt) return txt.trim().slice(0, 300);
    } catch {}
  }
  return null;
}

async function extractZip(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const files = [];
  const entries = Object.values(zip.files);

  for (const entry of entries) {
    if (entry.dir) continue;
    const entryPath = entry.name.replace(/\\/g, '/');
    const parts = entryPath.split('/');
    if (parts.some((p) => SKIP_DIRS.has(p) || p.startsWith('.'))) continue;
    if (SKIP_FILES.has(parts[parts.length - 1])) continue;
    const content = await entry.async('nodebuffer');
    files.push({ path: entryPath, content });
  }

  if (!files.length) throw new Error('Zip is empty or contains only skipped files.');

  const topFolders = [...new Set(files.map((f) => f.path.split('/')[0]))];
  if (topFolders.length === 1) {
    const prefix = `${topFolders[0]}/`;
    return files.map((f) => ({ ...f, path: f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path })).filter((f) => f.path);
  }
  return files;
}

async function resolveInput({ message, argText, sock }) {
  const htmlStart = argText.search(/<!doctype\s+html|<html[\s>]/i);
  if (htmlStart !== -1) return [{ path: 'index.html', content: Buffer.from(argText.slice(htmlStart), 'utf8') }];

  if (/^https?:\/\//i.test(argText)) {
    const url = argText.split(/\s/)[0];
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 45000, validateStatus: () => true });
    if (res.status !== 200) throw new Error(`Failed to fetch URL (HTTP ${res.status})`);
    const buf = Buffer.from(res.data);
    const ct = (res.headers['content-type'] || '').toLowerCase();
    if (url.toLowerCase().endsWith('.zip') || ct.includes('zip')) return extractZip(buf);
    if (url.toLowerCase().endsWith('.html') || ct.includes('html')) return [{ path: 'index.html', content: buf }];
    try { return await extractZip(buf); } catch {}
    return [{ path: 'index.html', content: buf }];
  }

  const ctx = message?.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) throw new Error('Reply to a .zip or .html file, or pass URL/inline HTML.');
  const quotedMessage = ctx.quotedMessage;
  const quotedKey = { remoteJid: message.key?.remoteJid, id: ctx.stanzaId, participant: ctx.participant };
  const buffer = await downloadMediaMessage({ key: quotedKey, message: quotedMessage }, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
  const fileName = quotedMessage.documentMessage?.fileName || 'upload';
  const mime = quotedMessage.documentMessage?.mimetype || '';
  if (fileName.toLowerCase().endsWith('.zip') || mime.includes('zip')) return extractZip(buffer);
  if (fileName.toLowerCase().endsWith('.html') || mime.includes('html')) return [{ path: 'index.html', content: buffer }];
  try { return await extractZip(buffer); } catch {}
  return [{ path: 'index.html', content: buffer }];
}

function vercelHeaders(token) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }
function cfHeaders(token) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }

async function vercelUploadFile(content, token) {
  const digest = crypto.createHash('sha1').update(content).digest('hex');
  const res = await axios.post(`${VERCEL_API}/v2/files`, content, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': digest, 'Content-Length': String(content.length) },
    timeout: 60000,
    validateStatus: () => true,
  });
  if (res.status !== 200 && res.status !== 409) throw new Error(`File upload HTTP ${res.status}`);
  return digest;
}

async function vercelCreateDeployment({ files, projectName, framework, token, teamId }) {
  const params = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const res = await axios.post(`${VERCEL_API}/v13/deployments${params}`, {
    name: projectName,
    files: files.map((f) => ({ file: f.path, sha: f.sha, size: f.size })),
    target: 'production',
    projectSettings: { framework: framework || null },
  }, { headers: vercelHeaders(token), timeout: 30000, validateStatus: () => true });
  if (res.status < 200 || res.status >= 300) throw new Error(`Deployment creation HTTP ${res.status}: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function vercelGetDeployment(id, token, teamId) {
  const params = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const res = await axios.get(`${VERCEL_API}/v13/deployments/${id}${params}`, { headers: vercelHeaders(token), timeout: 15000, validateStatus: () => true });
  if (res.status !== 200) throw new Error(`Get deployment HTTP ${res.status}`);
  return res.data;
}

async function vercelPollDeployment(id, token, teamId, onStatus) {
  const deadline = Date.now() + DEPLOY_TIMEOUT;
  let lastState = '';
  while (Date.now() < deadline) {
    const dep = await vercelGetDeployment(id, token, teamId);
    const state = dep.readyState || dep.state || 'UNKNOWN';
    if (state !== lastState) {
      await onStatus(state, dep);
      lastState = state;
    }
    if (state === 'READY') return dep;
    if (state === 'ERROR') throw new Error(`Build failed: ${dep.errorMessage || dep.errorCode || 'Unknown build error'}`);
    if (state === 'CANCELED') throw new Error('Deployment was canceled.');
    await sleep(4000);
  }
  throw new Error('Deployment timed out.');
}

async function cfUpsertCNAME(subdomain, target, token, zoneId) {
  const list = await axios.get(`${CF_API}/zones/${zoneId}/dns_records`, {
    params: { type: 'CNAME', name: `${subdomain}.${BASE_DOMAIN}`, per_page: 5 },
    headers: cfHeaders(token), timeout: 12000, validateStatus: () => true,
  });
  if (list.status !== 200) throw new Error(`Cloudflare DNS list HTTP ${list.status}`);
  const existing = list.data?.result?.[0] || null;
  const payload = { type: 'CNAME', name: subdomain, content: target, ttl: 1, proxied: false };
  if (existing) {
    const upd = await axios.put(`${CF_API}/zones/${zoneId}/dns_records/${existing.id}`, payload, { headers: cfHeaders(token), timeout: 12000, validateStatus: () => true });
    if (upd.status !== 200) throw new Error(`Cloudflare CNAME update HTTP ${upd.status}`);
    return 'updated';
  }
  const crt = await axios.post(`${CF_API}/zones/${zoneId}/dns_records`, payload, { headers: cfHeaders(token), timeout: 12000, validateStatus: () => true });
  if (crt.status !== 200 && crt.status !== 201) throw new Error(`Cloudflare CNAME create HTTP ${crt.status}`);
  return 'created';
}

async function vercelAddDomain(projectId, domain, token, teamId) {
  const params = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const res = await axios.post(`${VERCEL_API}/v9/projects/${projectId}/domains${params}`, { name: domain }, { headers: vercelHeaders(token), timeout: 15000, validateStatus: () => true });
  if (![200, 201, 409].includes(res.status)) throw new Error(`Add domain HTTP ${res.status}`);
}

async function vercelPollDomain(projectId, domain, token, teamId) {
  const deadline = Date.now() + DOMAIN_TIMEOUT;
  while (Date.now() < deadline) {
    const params = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    const res = await axios.get(`${VERCEL_API}/v9/projects/${projectId}/domains/${domain}${params}`, { headers: vercelHeaders(token), timeout: 15000, validateStatus: () => true });
    if (res.status === 200 && res.data?.verified) return true;
    await sleep(6000);
  }
  return false;
}

export default {
  name: 'deployfrontend',
  aliases: ['deployweb', 'verceldeploy'],
  category: 'utility',
  description: `Deploy frontend to Vercel and auto-configure *.${BASE_DOMAIN} via Cloudflare.`,
  usage: 'deployfrontend <subdomain> [url|html] (or reply to zip/html file)',
  cooldown: 15,
  args: true,

  async execute({ sock, message, args, from }) {
    const fontMap = loadFont();
    const S = (t) => sf(t, fontMap);
    const say = async (txt) => sock.sendMessage(from, { text: txt, contextInfo: ctxInfo(S) }, { quoted: message });
    const go = say;

    const raw = (args || []).join(' ').trim();
    const argv = raw.match(/^([a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?)\s*([\s\S]*)$/i);
    if (!argv) {
      await say(banner('DEPLOY FRONTEND', `📦 *Deploy any frontend to Vercel with custom subdomain.*\n\nUsage:\n\`.deployfrontend <subdomain> [url|html]\`\n\nResult:\n\`https://myweb.${BASE_DOMAIN}\``, S));
      return;
    }

    const subdomain = argv[1].toLowerCase();
    const extraArgs = argv[2].trim();
    const fullDomain = `${subdomain}.${BASE_DOMAIN}`;

    const vercelToken = process.env.VERCEL_TOKEN || '';
    const cfToken = process.env.CF_TOKEN || '';
    const cfZoneId = process.env.CF_ZONE_ID || '';
    const teamId = process.env.VERCEL_TEAM_ID || null;
    const qwenKeys = (process.env.QIMGEDIT_KEYS || '').split(',').map((k) => k.trim()).filter((k) => k.length > 20);

    if (!vercelToken) return say(banner('DEPLOYFRONTEND ❌', '`VERCEL_TOKEN` not set.', S));
    if (!cfToken) return say(banner('DEPLOYFRONTEND ❌', '`CF_TOKEN` not set.', S));
    if (!cfZoneId) return say(banner('DEPLOYFRONTEND ❌', '`CF_ZONE_ID` not set.', S));

    await go(`⏳ *[1/7] Reading files...*\nTarget: \`${fullDomain}\``);

    let files;
    try {
      files = await resolveInput({ message, argText: extraArgs, sock });
    } catch (err) {
      await say(banner('DEPLOYFRONTEND ❌', `Could not read input files.\n\n${err.message}`, S));
      return;
    }

    if (files.length > MAX_FILES) return say(banner('DEPLOYFRONTEND ❌', `Too many files: ${files.length}.`, S));
    const totalBytes = files.reduce((s, f) => s + (f.content?.length || 0), 0);
    if (totalBytes > MAX_TOTAL_BYTES) return say(banner('DEPLOYFRONTEND ❌', `Total size ${fmtBytes(totalBytes)} exceeds 100 MB.`, S));

    await go(`✅ *[1/7] Files ready* — ${files.length} file(s) · ${fmtBytes(totalBytes)}`);
    await go('⏳ *[2/7] Checking Vercel compatibility...*');

    const compat = checkCompatibility(files);
    if (!compat.ok) {
      let aiNote = '';
      if (qwenKeys.length) {
        const verdict = await qwenAsk(qwenKeys, `Vercel rejection: ${compat.reason}. Suggest best alternative host in one sentence.`);
        if (verdict) aiNote = `\n\n🤖 *AI Analysis:* ${verdict}`;
      }
      await say(banner('DEPLOYFRONTEND ❌', `*Not compatible with Vercel*\n\n${compat.reason}${aiNote}`, S));
      return;
    }

    const projectName = toProjectName(subdomain);
    await go(`✅ *[2/7] Compatible*\n🔹 Framework: *${compat.frameworkLabel}*\n🔹 Project: \`${projectName}\``);

    await go(`⏳ *[3/7] Uploading ${files.length} file(s)...*`);
    const deployFiles = [];
    for (const file of files) {
      const sha = await vercelUploadFile(file.content, vercelToken);
      deployFiles.push({ path: file.path, sha, size: file.content.length });
    }
    await go(`✅ *[3/7] Uploaded ${deployFiles.length} file(s)*`);

    await go('⏳ *[4/7] Creating Vercel deployment...*');
    let deployment;
    try {
      deployment = await vercelCreateDeployment({ files: deployFiles, projectName, framework: compat.framework, token: vercelToken, teamId });
    } catch (err) {
      await say(banner('DEPLOYFRONTEND ❌', `Deployment creation failed:\n${err.message}`, S));
      return;
    }

    await go(`✅ *[4/7] Deployment queued*\nID: \`${deployment.id}\``);
    await go('⏳ *[5/7] Waiting for deployment...*');

    let readyDep;
    try {
      readyDep = await vercelPollDeployment(deployment.id, vercelToken, teamId, async (state) => {
        await go(`🔄 ${state}`);
      });
    } catch (err) {
      await say(banner('DEPLOYFRONTEND ❌', `Deployment failed:\n${err.message}`, S));
      return;
    }

    const vercelURL = `https://${readyDep.url}`;
    await go(`✅ *[5/7] Live on Vercel*\n${vercelURL}`);

    await go(`⏳ *[6/7] Configuring Cloudflare DNS...*`);
    try {
      const action = await cfUpsertCNAME(subdomain, VERCEL_CNAME_TARGET, cfToken, cfZoneId);
      await go(`✅ *[6/7] DNS ${action}*\n\`${fullDomain}\` → \`${VERCEL_CNAME_TARGET}\``);
    } catch (err) {
      await say(banner('DEPLOYFRONTEND ⚠️', `DNS configuration failed:\n${err.message}\n\nSite is live at: ${vercelURL}`, S));
      return;
    }

    await go(`⏳ *[7/7] Linking domain in Vercel...*`);
    try {
      await vercelAddDomain(deployment.projectId, fullDomain, vercelToken, teamId);
    } catch (err) {
      await say(banner('DEPLOYFRONTEND ⚠️', `Failed to link domain:\n${err.message}`, S));
      return;
    }

    const verified = await vercelPollDomain(deployment.projectId, fullDomain, vercelToken, teamId);
    if (verified) {
      await say(banner('DEPLOYFRONTEND ✅', `✅ Deployment complete!\n\nVercel URL: ${vercelURL}\nCustom URL: *https://${fullDomain}*`, S));
    } else {
      await say(banner('DEPLOYFRONTEND ✅', `✅ Deployment done. DNS still propagating.\n\nVercel URL: ${vercelURL}\nCustom URL: https://${fullDomain}`, S));
    }
  },
};
