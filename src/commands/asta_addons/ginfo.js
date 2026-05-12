export default {
  config: {
    name: "ginfo",
    description: "Shows detailed information about the group",
    usage: [".groupinfo"],
    category: "group",
  },

  onRun: async (sock, message) => {
    const jid = message.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(
        jid,
        { text: "❌ This command can only be used in groups." },
        { quoted: message }
      );
    }

    try {
      // Fetch group metadata
      const metadata = await sock.groupMetadata(jid);

      const name = metadata.subject || "Unknown";
      const desc = metadata.desc || "No description";
      const owner = metadata.owner || "Unknown";
      const created = metadata.creation
        ? new Date(metadata.creation * 1000).toLocaleString()
        : "Unknown";

      const participants = metadata.participants || [];

      const admins = participants
        .filter(p => p.admin)
        .map(p => `• @${p.id.split("@")[0]}`);

      const membersCount = participants.length;

      // Try to fetch group profile picture
      let pfp;
      try {
        pfp = await sock.profilePictureUrl(jid, "image");
      } catch {
        pfp = null;
      }

      const text = `
👥 *GROUP INFORMATION*

📛 *Name:* ${name}
🆔 *Group ID:* ${jid}
📝 *Description:* 
${desc}

📅 *Created On:* ${created}
👑 *Owner:* ${owner !== "Unknown" ? "@" + owner.split("@")[0] : "Unknown"}

👥 *Members:* ${membersCount}
🛡️ *Admins (${admins.length}):*
${admins.length ? admins.join("\n") : "None"}
`;

      if (pfp) {
        await sock.sendMessage(
          jid,
          {
            image: { url: pfp },
            caption: text,
            mentions: participants.map(p => p.id)
          },
          { quoted: message }
        );
      } else {
        await sock.sendMessage(
          jid,
          {
            text,
            mentions: participants.map(p => p.id)
          },
          { quoted: message }
        );
      }

    } catch (err) {
      await sock.sendMessage(
        jid,
        { text: "❌ Failed to fetch group info." },
        { quoted: message }
      );
    }
  }
};