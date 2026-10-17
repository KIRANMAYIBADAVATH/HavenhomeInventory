# Haven — Home Inventory Manager

React + Vite frontend, **Supabase** (login + database), **Vercel** (hosting + serverless AI endpoints), Claude for two AI features.

```
Browser (React) ──► Supabase Auth + Postgres (row-level security: each user sees only their own data)
        │
        └──► /api/search-interpret, /api/generate-notes (Vercel functions) ──► Anthropic
             (these verify the Supabase login token; the Anthropic key never reaches the browser)
```

## 1. Set up Supabase (5 minutes)

1. Create a free project at https://supabase.com.
2. **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, click **Run**.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
4. (Optional, easier demos) **Authentication → Providers → Email**: turn off "Confirm email". If you leave it on, new users must click an emailed link before logging in; the app handles both.

## 2. Run locally

```powershell
# in the haven folder
npm install
copy .env.example .env.local      # then fill in the values
npm install -g vercel             # one time
vercel dev                        # runs the site AND the /api functions together
```

`npm run dev` alone runs only the frontend: login and inventory work, but the two AI features will show "Cannot reach the AI server". Use `vercel dev` to test AI locally.

## 3. Deploy on Vercel

1. Push this folder to a GitHub repository (`.env*` files are git-ignored).
2. Vercel → **Add New → Project** → import the repo (Framework: Vite is auto-detected).
3. **Settings → Environment Variables**, add for Production:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
   - `CLAUDE_MODEL` = `claude-haiku-5-5`
4. Deploy. Then in Supabase **Authentication → URL Configuration**, set **Site URL** to your Vercel URL (needed for confirmation emails).

## 4. Test checklist

1. Open `/api/health` → `{"ok":true,"aiConfigured":true,"authConfigured":true}`.
2. Register, then log in/out. Opening `/items` while logged out redirects to `/login`.
3. Load demo data → Rice: Use 1 kg (5→4), Restock 3 kg (→7).
4. Refresh the page and open it in another browser while logged in: data persists (stored in Supabase).
5. Register a second account: it starts empty (row-level security).
6. AI search: "Kitchen lo unna items chupinchu". Add Item → Generate Notes.
7. Remove `ANTHROPIC_API_KEY` and redeploy: login, CRUD and manual search still work.

## Known limitations (good to state in an interview)

- Inventory is stored as **one JSON document per user** (`user_data.data`). Simple and reliable for a single household, but if the same account edits on two devices at once, the last save wins. Next step: normalised tables (items, rooms, shopping_list, transactions) with server-side stock updates.
- AI rate limiting is per serverless instance (best effort). For production use Upstash/Redis or Vercel's WAF rate limits.
- Existing browser data from the old localStorage version (`haven:v1`) is copied into your account on first login; the original is never deleted.
- Not implemented: image upload, room icons, batch-level expiry, password reset UI (Supabase supports it).
