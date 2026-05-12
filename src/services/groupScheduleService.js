const state = global.groupScheduleState || (global.groupScheduleState = { close: new Map(), open: new Map(), timer: null });

function parseTime(input='') {
  const s = String(input).trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]); const min = Number(m[2] || '0'); const ap = m[3];
  if (min < 0 || min > 59 || h < 0 || h > 23) return null;
  if (ap) { if (h === 12) h = 0; if (ap === 'pm') h += 12; }
  return { h, min, label: `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}` };
}

export function setCloseTime(groupId, t) { state.close.set(groupId, t); }
export function setOpenTime(groupId, t) { state.open.set(groupId, t); }

export function startGroupScheduler(sock) {
  if (state.timer) return;
  state.timer = setInterval(async () => {
    const now = new Date(); const hh = now.getHours(); const mm = now.getMinutes();
    for (const [gid, t] of state.close) if (t.h === hh && t.min === mm) await sock.groupSettingUpdate(gid, 'announcement').catch(()=>{});
    for (const [gid, t] of state.open) if (t.h === hh && t.min === mm) await sock.groupSettingUpdate(gid, 'not_announcement').catch(()=>{});
  }, 30000);
}

export { parseTime };
