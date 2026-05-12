const memory = new Map();

export function addToHistory(jid, role, text) {
  if (!["user", "model"].includes(role)) return;

  if (!memory.has(jid)) memory.set(jid, []);
  memory.get(jid).push({ role, parts: [{ text }] });

 
  if (memory.get(jid).length > 20) {
    memory.get(jid).shift();
  }
}

export function getHistory(jid) {
  return memory.get(jid) || [];
}

export function clearHistory(jid) {
  memory.delete(jid);
}