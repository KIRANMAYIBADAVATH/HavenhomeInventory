import { aiConfigured, authConfigured } from './_lib/common.js';

export default function handler(_req, res) {
  res.status(200).json({ ok: true, aiConfigured: aiConfigured(), authConfigured: authConfigured() });
}
