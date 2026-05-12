import config from "../config.js";

async function checkPermission(sock, message, permission) {
  console.log('Checking permission for', message.key.remoteJid, message.key.participant);
  console.log('Bot admins:', config.bot.admins);
  if (permission === 0) {
    return true;
  } else if (permission === 1) {
   if (permission === 1) {
  if (!config.bot.admins.includes(message.key.participantAlt || message.key.participant|| message.key.remoteJidAlt || message.key.remoteJid)) {
    await message.reply('You do not have permission to use this command.');
    return false;
  }
}

  } else if (permission === 2) {
    if (message.key.remoteJid.endsWith('@g.us')) {
      const groupMetadata = await sock.groupMetadata(message.key.remoteJid);
      const isAdmin = groupMetadata.participants.find((participant) => participant.jid === message.sender && participant.isAdmin || participant.jid === message.sender && participant.isSuperAdmin);
      if (!isAdmin) {
        await message.reply('You do not have permission to use this command.');
        return false;
      }
    } else {
      await message.reply('This command can only be used in groups.');
      return false;
    }
  } else if (permission === 3) {
    if (!message.key.remoteJid.endsWith('@g.us')) {
      await message.reply('This command can only be used in groups.');
      return false;
    }
  }
  return true;
}

export function getRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function validateUserJid(jid) {
  if (!jid.includes('@s.whatsapp.net')) {
    return false;
  }
  return true;
}


export { checkPermission }