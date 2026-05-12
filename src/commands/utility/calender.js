function renderCalendar(year, month) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const days = last.getDate();
  const start = first.getDay();

  const header = `${first.toLocaleString('en-US', { month: 'long' })} ${year}`;
  const lines = [header, 'Su Mo Tu We Th Fr Sa'];
  let row = Array(start).fill('  ');

  for (let day = 1; day <= days; day += 1) {
    row.push(String(day).padStart(2, ' '));
    if (row.length === 7) {
      lines.push(row.join(' '));
      row = [];
    }
  }
  if (row.length) lines.push([...row, ...Array(7 - row.length).fill('  ')].join(' '));
  return lines.join('\n');
}

export default {
  name: 'calender',
  aliases: ['calendar', 'cal'],
  category: 'utility',
  description: 'Show monthly calendar in code block',
  usage: 'calender [month] [year]',
  cooldown: 2,

  async execute({ sock, message, from, args }) {
    const now = new Date();
    const month = Number.parseInt(args[0], 10) || (now.getMonth() + 1);
    const year = Number.parseInt(args[1], 10) || now.getFullYear();
    if (month < 1 || month > 12) {
      return sock.sendMessage(from, { text: '❌ Month must be between 1 and 12.' }, { quoted: message });
    }

    const cal = renderCalendar(year, month);
    return sock.sendMessage(from, { text: `\`\`\`\n${cal}\n\`\`\`` }, { quoted: message });
  }
};
