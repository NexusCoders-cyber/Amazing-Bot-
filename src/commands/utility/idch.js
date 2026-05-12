function parseChannelInput(input = '') {
  const raw = String(input || '').trim();
  if (!raw) return { jid: '', invite: '' };

  if (raw.endsWith('@newsletter')) return { jid: raw, invite: '' };

  const urlMatch = raw.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
  if (urlMatch?.[1]) {
    const token = urlMatch[1];
    if (/^\d{10,30}$/.test(token)) return { jid: `${token}@newsletter`, invite: token };
    return { jid: '', invite: token };
  }

  const clean = raw.replace(/\s+/g, '');
  if (/^\d{10,30}$/.test(clean)) return { jid: `${clean}@newsletter`, invite: clean };

  if (/^[A-Za-z0-9_-]{8,64}$/.test(clean)) return { jid: '', invite: clean };

  return { jid: '', invite: '' };
}

function safe(value, fallback = 'N/A') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return fallback; }
  }
  const out = String(value).trim();
  return out || fallback;
}

async function lookupChannel(sock, { jid, invite }) {
  if (typeof sock.newsletterMetadata !== 'function') {
    throw new Error('This bot build does not support newsletter metadata lookup.');
  }

  if (jid) {
    try {
      return await sock.newsletterMetadata('jid', jid);
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      if (!invite || (!message.includes('bad request') && !message.includes('graphql'))) throw error;
    }
  }

  if (invite) {
    return await sock.newsletterMetadata('invite', invite);
  }

  throw new Error('Invalid channel ID or invite token.');
}

export default {
  name: 'idch',
  aliases: ['channelid', 'newsletterinfo', 'channelinfo', 'chinfo'],
  category: 'utility',
  description: 'Fetch newsletter/channel metadata by channel ID or invite link',
  usage: 'idch <channel_id|@newsletter_jid|channel_link>',
  cooldown: 5,
  permissions: ['user'],
  args: true,
  minArgs: 1,

  async execute({ sock, message, from, args }) {
    const parsed = parseChannelInput(args.join(' '));
    if (!parsed.jid && !parsed.invite) {
      return sock.sendMessage(from, {
        text: '❌ Invalid channel input. Example: .idch 120363406682873896 or .idch https://whatsapp.com/channel/XXXX'
      }, { quoted: message });
    }

    try {
      const data = await lookupChannel(sock, parsed);
      const resolvedJid = data?.id || parsed.jid || 'N/A';
      const dpUrl = data?.picture?.url || data?.picture?.directPath || null;
      const text = [
        '📦 *Full Channel Info*',
        `🆔 *JID:* ${safe(resolvedJid)}`,
        `👤 *Channel Name:* ${safe(data?.name || data?.channelName)}`,
        `🏷️ *Newsletter Name:* ${safe(data?.newsletterName || data?.thread_metadata?.name || data?.name)}`,
        `👥 *Followers:* ${safe(data?.subscribers || data?.followerCount || data?.followers)}`,
        `📊 *Status:* ${safe(data?.state?.type || data?.state || data?.status)}`,
        `✔️ *Verified:* ${data?.verification === 'VERIFIED' || data?.verified ? 'Yes' : 'No'}`,
        `📝 *Description:* ${safe(data?.description || data?.thread_metadata?.description)}`,
        `🖼️ *Channel DP:* ${safe(dpUrl)}`,
        `🕒 *Created:* ${safe(data?.creationTime || data?.createdAt)}`
      ].join('\n');

      if (dpUrl) {
        return sock.sendMessage(from, {
          image: { url: dpUrl },
          caption: text
        }, { quoted: message });
      }

      return sock.sendMessage(from, { text }, { quoted: message });
    } catch (error) {
      const lowered = String(error?.message || '').toLowerCase();
      const hint = lowered.includes('bad request') || lowered.includes('graphql')
        ? '\nHint: use channel link or invite token if numeric ID lookup fails.'
        : '';

      return sock.sendMessage(from, {
        text: `❌ Failed to fetch channel info: ${error.message}${hint}`
      }, { quoted: message });
    }
  }
};
