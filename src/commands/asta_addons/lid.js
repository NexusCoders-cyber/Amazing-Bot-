export default {
  config: {
    name: "lid",
    description: "Get a user's lID",
    usage: [".lid", ".lid @user", "reply → .lid"],
    category: "general"
  },

  onRun: async (sock, message, args) => {
    let lid;

    // 1️⃣ If replying to someone
    lid = message.message?.extendedTextMessage?.contextInfo?.participantAlt;

    // 2️⃣ If mentioning someone
    if (!lid && message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      lid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }

    // 3️⃣ Fallback to sender
    if (!lid) {
      lid = message.key.participant || message.key.remoteJid;
    }

    await sock.sendMessage(
      message.key.remoteJid,
      { text: `🆔 LID:\n${lid}` },
      { quoted: message }
    );
  }
};
