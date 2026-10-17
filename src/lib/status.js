const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const isLow = (i) => i.consumable !== false && Number(i.quantity) <= Number(i.minStock);

// returns: 'na' (not consumable) | 'none' (no date) | 'expired' | 'expiring_soon' | 'ok'
export function expiryStatus(i, days = 7) {
  if (i.consumable === false) return 'na';
  if (!i.expiry) return 'none';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(i.expiry + 'T00:00:00') - today) / 864e5);
  if (diff < 0) return 'expired';
  return diff <= days ? 'expiring_soon' : 'ok';
}
