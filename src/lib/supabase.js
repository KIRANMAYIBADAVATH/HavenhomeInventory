import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);
// Placeholder values keep the app from crashing at import time; App shows a setup message instead.
export const supabase = createClient(url || 'http://localhost', key || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
});
