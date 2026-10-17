import { ask, isStr, strList, protectedAi } from './_lib/common.js';

export default protectedAi(async (req, res) => {
  const { query, rooms, categories } = req.body || {};
  if (!isStr(query, 200)) return res.status(400).json({ error: 'Invalid query' });
  if (!strList(rooms) || !strList(categories)) return res.status(400).json({ error: 'Invalid rooms or categories' });

  // Only the query and the allowed room/category names reach the AI. Never inventory data.
  const system =
    'You convert a household inventory search query (English, Telugu, or Tanglish) into JSON. ' +
    'Reply with ONLY a JSON object: {"room":string|null,"category":string|null,"text":string|null,"low":boolean,"expiry":null|"expiring_soon"|"expired"}. ' +
    `Allowed rooms: ${JSON.stringify(rooms)}. Allowed categories: ${JSON.stringify(categories)}. ` +
    'Use null if nothing matches. "text" is a short English keyword only if the user names a specific item. No explanations.';

  const raw = await ask(system, query, 150);
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw Object.assign(new Error('bad'), { code: 'BAD_AI' });
  const j = JSON.parse(m[0]);

  const pick = (v, list) => (typeof v === 'string' ? list.find((x) => x.toLowerCase() === v.toLowerCase()) || null : null);
  res.status(200).json({
    room: pick(j.room, rooms),
    category: pick(j.category, categories),
    text: typeof j.text === 'string' && j.text.trim() && j.text.length <= 60 ? j.text.trim() : null,
    low: j.low === true,
    expiry: ['expiring_soon', 'expired'].includes(j.expiry) ? j.expiry : null,
  });
});
