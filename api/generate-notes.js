import { ask, isStr, protectedAi } from './_lib/common.js';

export default protectedAi(async (req, res) => {
  const { name, brand = '', category } = req.body || {};
  if (!isStr(name, 100) || !isStr(category, 60) || typeof brand !== 'string' || brand.length > 60) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const system =
    'Write a household inventory note: at most 2 sentences and fewer than 40 words. ' +
    'Mention typical purpose and, if useful, a storage tip. Do NOT invent specifications, prices, quantities, expiry dates, certifications or safety claims. Output only the note.';
  let text = await ask(system, `Item: ${name}\nBrand: ${brand || 'n/a'}\nCategory: ${category}`, 120);
  if (!text) throw Object.assign(new Error('bad'), { code: 'BAD_AI' });

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  text = sentences.slice(0, 2).join(' ').trim();
  const words = text.split(/\s+/);
  if (words.length >= 40) text = words.slice(0, 39).join(' ').replace(/[,;:]$/, '') + '.';
  res.status(200).json({ description: text });
});
