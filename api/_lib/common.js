import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-5-5';

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);
export const authConfigured = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

export const isStr = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export const strList = (v) => Array.isArray(v) && v.length <= 50 && v.every((s) => isStr(s, 60));

// Verifies the Supabase access token sent by the browser. Returns the user id or null.
export async function getUserId(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !authConfigured()) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  return error || !data?.user ? null : data.user.id;
}

// Best-effort limiter (serverless instances do not share memory, so this is per-instance only).
const hits = new Map();
export function limited(userId, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return true;
  recent.push(now);
  hits.set(userId, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

export async function ask(system, user, maxTokens) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 15000, maxRetries: 1 });
  const r = await client.messages.create({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
  return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

export function mapError(e) {
  if (e?.name?.includes('Timeout')) return [504, 'AI request timed out'];
  if (e?.status === 401 || e?.status === 403) return [502, 'AI credentials are invalid'];
  if (e?.status === 429) return [429, 'AI rate limit reached, try again shortly'];
  if (e?.status === 400 && /credit|billing/i.test(e?.message || '')) return [402, 'AI credits exhausted'];
  if (e instanceof SyntaxError || e?.code === 'BAD_AI') return [502, 'AI returned an unusable response'];
  console.error('AI error, status:', e?.status); // never log message or headers
  return [502, 'AI service unavailable'];
}

// Wraps a handler: POST only, auth required, AI configured, rate limited, safe errors.
export const protectedAi = (handler) => async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!authConfigured()) return res.status(503).json({ error: 'Authentication is not configured on the server' });
  const userId = await getUserId(req).catch(() => null);
  if (!userId) return res.status(401).json({ error: 'Please log in again' });
  if (!aiConfigured()) return res.status(503).json({ error: 'AI is not configured on the server' });
  if (limited(userId)) return res.status(429).json({ error: 'Too many AI requests. Try again in a minute.' });
  try { await handler(req, res); } catch (e) { const [s, m] = mapError(e); res.status(s).json({ error: m }); }
};
