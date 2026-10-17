import { supabase } from './supabase.js';

const LEGACY_KEY = 'haven:v1'; // data saved in this browser before accounts existed

export const defaultData = () => ({
  items: [],
  rooms: ['Living Room', 'Bedroom', 'Kitchen', 'Study Room'],
  categories: ['Kitchen and Groceries', 'Electronics', 'Furniture', 'Clothing', 'Cleaning Supplies',
    'Bathroom', 'Personal Care', 'Medicines', 'Tools', 'Other Household Items'],
  shopping: [],
  activity: [],
  settings: { expiryDays: 7 },
});

const normalise = (d) => ({ ...defaultData(), ...(d && typeof d === 'object' ? d : {}) });

// Loads this user's inventory from Supabase. Throws on a network/permission error so the caller can show it.
// First login only: if no row exists yet, adopt old browser-local data (copied, never deleted).
export async function loadRemote(userId) {
  const { data, error } = await supabase.from('user_data').select('data').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message || 'Could not load your inventory');
  if (data) return normalise(data.data);

  let initial = defaultData();
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) initial = normalise(JSON.parse(legacy));
  } catch { /* ignore unreadable legacy data */ }

  await saveRemote(userId, initial);
  return initial;
}

export async function saveRemote(userId, data) {
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message || 'Could not save your inventory');
}
