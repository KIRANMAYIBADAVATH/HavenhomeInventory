// [family, factor to smallest unit]. Packets/bottles/boxes/pieces never convert to each other.
export const UNITS = {
  kg: ['mass', 1000], g: ['mass', 1],
  litres: ['volume', 1000], ml: ['volume', 1],
  pieces: ['pieces', 1], packets: ['packets', 1], bottles: ['bottles', 1], boxes: ['boxes', 1],
};

export const compatibleUnits = (unit) => Object.keys(UNITS).filter((u) => UNITS[u][0] === UNITS[unit]?.[0]);

export function convert(amount, from, to) {
  if (!UNITS[from] || !UNITS[to] || UNITS[from][0] !== UNITS[to][0]) return null;
  return Math.round(((amount * UNITS[from][1]) / UNITS[to][1]) * 1000) / 1000;
}

export function applyStock(item, type, amount, unit) {
  const a = Number(amount);
  if (!Number.isFinite(a) || a < 0 || (type !== 'adjust' && a === 0)) return { error: 'Enter a valid positive number' };
  const c = convert(a, unit, item.unit);
  if (c === null) return { error: `Cannot combine ${unit} with ${item.unit}` };
  const cur = Number(item.quantity);
  let q = type === 'use' ? cur - c : type === 'restock' ? cur + c : c;
  q = Math.round(q * 1000) / 1000;
  if (q < 0) return { error: 'Not enough stock for that amount' };
  return { q, change: Math.round((q - cur) * 1000) / 1000 };
}
