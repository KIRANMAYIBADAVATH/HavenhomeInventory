import { supabase } from './supabase.js';

// Empty base = same origin (Vercel serves /api next to the site). Override only if the API lives elsewhere.
const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function post(path, body, timeout = 20000) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please log in again');

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI request timed out');
    if (e instanceof TypeError) throw new Error('Cannot reach the AI server');
    throw e;
  } finally { clearTimeout(t); }
}

export const api = {
  // Only the query and allowed room/category names are sent. Never inventory data.
  interpretSearch: (query, rooms, categories) => post('/api/search-interpret', { query, rooms, categories }),
  generateNotes: (payload) => post('/api/generate-notes', payload),
};
