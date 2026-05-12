import { setReplyCallback } from "../../handler/replyHandler.js";

export default {
  config: {
    name: "ask",
    description: "Ask user something"
  },

  onRun: async (sock, message) => {
    const sent = await sock.sendMessage(
      message.key.remoteJid,
      { text: "Reply to this message with your name:" },
      { quoted: message }
    );

    const userJid =
      message.key.participantAlt ||
      message.key.participant ||
      message.key.remoteJid;

    setReplyCallback(sent.key.id, userJid, async (sock, replyMsg) => {
      const text =
        replyMsg.message?.conversation ||
        replyMsg.message?.extendedTextMessage?.text;

      await replyMsg.reply(`Nice to meet you, ${text}!`)
      });
  }
};

