import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Removes stray spaces/newlines and surrounding quotes pasted into Vercel env values.
const clean = (v) => (v || '').trim().replace(/^['"]|['"]$/g, '');
const MODEL = clean(process.env.CLAUDE_MODEL) || 'claude-haiku-5-5';
const API_KEY = clean(process.env.ANTHROPIC_API_KEY);

export const aiConfigured = () => Boolean(API_KEY);
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
  const client = new Anthropic({ apiKey: API_KEY, timeout: 15000, maxRetries: 1 });
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

export function mapError(e) {
  const status = e?.status;
  const type = e?.error?.error?.type || e?.error?.type || '';
  const msg = String(e?.message || '');

  // Log the cause (never the key or headers) so it shows in Vercel > Logs.
  console.error('AI error', JSON.stringify({
    name: e?.name, status, type, code: e?.code, model: MODEL, message: msg.slice(0, 300),
  }));

  if (e?.name?.includes('Timeout')) return [504, 'AI request timed out'];
  if (status === 401 || status === 403) return [502, 'The AI key was rejected. Check ANTHROPIC_API_KEY on the server.'];
  if (status === 404) return [502, `AI model "${MODEL}" was not found. Check CLAUDE_MODEL on the server.`];
  if (status === 400 && /credit|billing/i.test(msg)) return [402, 'AI credits exhausted. Add credits in the Anthropic console.'];
  if (status === 400) return [502, 'The AI request was rejected. Check CLAUDE_MODEL on the server.'];
  if (status === 429) return [429, 'AI rate limit reached, try again shortly'];
  if (status === 529 || status >= 500) return [503, 'The AI service is busy. Try again in a moment.'];
  if (e instanceof SyntaxError || e?.code === 'BAD_AI') return [502, 'AI returned an unusable response. Try rephrasing.'];
  if (/connection|fetch|ENOTFOUND|ECONN/i.test(`${e?.name} ${msg}`)) return [502, 'Could not reach the AI service'];
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
  try {
    await handler(req, res);
  } catch (e) {
    const [s, m] = mapError(e);
    res.status(s).json({ error: m });
  }
};