# WhatsApp Legacy Command Migration (GoatBot/FCA → Asta Bot)

This project uses **ESM command modules** with `export default` and an `execute()` method.

## Required command structure

```js
export default {
  name: 'yourcommand',
  aliases: ['alias1'],
  category: 'general',
  description: 'What it does',
  usage: 'yourcommand <args>',
  example: 'yourcommand test',
  cooldown: 5,
  permissions: ['user'],

  async execute({ sock, message, args, from, sender, prefix }) {
    await sock.sendMessage(from, { text: 'done' }, { quoted: message });
  }
};
```

## Mapping from GoatBot style

- `config.name` → `name`
- `config.aliases` → `aliases`
- `config.category` → `category`
- `config.countDown` → `cooldown`
- `config.role`:
  - `0` → `permissions: ['user']`
  - `1` → `permissions: ['admin']`
  - `2` → `permissions: ['owner']`
- `onStart(ctx)` → `execute(ctx)`

## `message` / `api` replacements

- `api.sendMessage(body, threadID, messageID)`
  → `sock.sendMessage(from, { text: body }, { quoted: message })`
- `message.reply(text)`
  → `sock.sendMessage(from, { text }, { quoted: message })`
- `event.threadID` → `from`
- `event.senderID` → `sender`

## How to handle `onReply`

Use `global.replyHandlers`, keyed by sent message id:

```js
if (!global.replyHandlers) global.replyHandlers = {};
const sent = await sock.sendMessage(from, { text: 'Reply YES or NO' }, { quoted: message });

global.replyHandlers[sent.key.id] = {
  command: 'mycommand',
  handler: async (replyText, replyMessage) => {
    if (replyText.toLowerCase() === 'yes') {
      await sock.sendMessage(from, { text: 'Confirmed' }, { quoted: replyMessage });
    }
    delete global.replyHandlers[sent.key.id];
  }
};
```

`messageHandler` already routes reply messages to registered handlers.

## Converted examples in this repo

- `pokechamps` (games)
- `pokedex` (games)
- `animevideo2` (media)
- `randomedit` (media)
- `morse` (utility)
- `googleimg` (utility)
- `goatai` (ai command generator, owner-only)
- `ngl` (utility, owner-only, single-send guard)

## Moderation/safety notes

- Spam, harassment, privacy abuse, or doxxing-style commands should not be ported.
- Explicit NSFW content commands should stay disabled unless you have strict moderation and legal compliance.
- Commands that can be used for abuse (scraping, obfuscation, mass DM) should be owner-only and audited.
