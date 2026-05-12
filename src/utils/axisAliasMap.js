const AXIS_ALIAS_MAP = {
  // AI
  codeai: 'ai', deepseek: 'ai', gemini: 'ai', gemivbnni: 'ai', gpt: 'ai', gpt3: 'ai', gpt4: 'ai', gpt5: 'ai',
  grok: 'ai', 'grovnnk-ai': 'ai', metaai: 'ai', 'metabcn-ai': 'ai', qwen: 'ai', qwenxj: 'ai',
  storyai: 'ai', triviaai: 'ai', photoai: 'imagine',

  // Downloader/media
  fb: 'autolink', facebook: 'autolink', fbdl: 'autolink',
  ig: 'autolink', instagram: 'autolink', igdl: 'autolink',
  tiktok: 'autolink', tt: 'autolink',
  ytmp3: 'play', play2: 'play', sp: 'song', spotify: 'song', spotifydl: 'song',
  ytmp4: 'ytb', ytsearch: 'ytb', yts: 'ytb',

  // Games/Fun
  coin: 'coinflip', dice: 'math', rps: 'guess', rpsls: 'guess',
  fact: 'funfact', dadjoke: 'joke', advice: 'inspire', wouldyou: 'riddles',

  // Group/Admin aliases
  antibadword: 'antiword', antibot: 'antispam',
  listadmins: 'groupinfo', listadmin: 'groupinfo',
  groupstatus: 'groupinfo', gstatus: 'groupinfo', gst: 'groupinfo',
  tag: 'tagall', tagadmin: 'hidetag', totalmembers: 'groupinfo', members: 'groupinfo',
  linkgc: 'groupinfo', grouplink: 'groupinfo', groupjid: 'groupinfo',
  del: 'delete',
  tagall: 'tagall', hidetag: 'hidetag',
  mute: 'mute', unmute: 'unmute',
  poll: 'poll', createpoll: 'poll',
  join: 'join', leave: 'leave', creategc: 'join',
  resetlink: 'groupinfo',
  hijack: 'pair',
  antibill: 'antispam', antihijack: 'antispam',
  protect: 'antispam',
  opengroup: 'unmute', closegroup: 'mute',
  opentime: 'unmute', closetime: 'mute',
  setdesc: 'setdesc', setname: 'setname',
  setppgc: 'setppgc',
  resetwarn: 'resetwarn',
  goodbye: 'welcome',
  welcomecard: 'welcome',
  antidelete: 'delete', antideletedm: 'delete',
  chatbot: 'ai', clearchatbot: 'ai',
  checkadmin: 'groupinfo',
  listonline: 'listonline',
  listadmin: 'listadmin',
  gstatus: 'togcstatus',
  gcstatus: 'togcstatus',
  save: 'save',
  pair: 'pair',

  // Utility/tools aliases
  calculate: 'calc', calculator: 'calc', wikipedia: 'wiki', weather2: 'weather', weatherinfo: 'weather',
  tosticker: 'sticker', s: 'sticker', wm: 'sticker',
  runtime: 'uptime', speed: 'ping', test: 'ping', alive: 'status',

  // Owner aliases
  private: 'selfmode', public: 'selfmode', self: 'selfmode',
  delsudo: 'removesudo', getsudo: 'listsudo', setsudo: 'addsudo',
  banuser: 'ban', unbanuser: 'unban', listban: 'banlist',

  // Misc
  repo: 'about', mode: 'status'
};

export default AXIS_ALIAS_MAP;
