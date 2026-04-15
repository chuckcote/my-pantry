# 🥘 My Pantry

AI-powered pantry manager — tracks fridge, freezer & pantry, suggests recipes, auto-deducts ingredients.

## Architecture
- **Frontend**: React (CDN) — safe to commit, no secrets
- **Backend proxy**: `api/chat.js` — Vercel serverless function, holds Anthropic key secretly
- **Database**: Supabase — real-time, cloud-synced across all devices
- **Hosting**: Vercel (free tier)

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/chuckcote/my-pantry.git
git push -u origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"** → import `my-pantry`
3. Click **Deploy** (no build settings needed)

### 3. Add your Anthropic API key as a secret
In your Vercel project → **Settings → Environment Variables**:
- Name: `ANTHROPIC_API_KEY`
- Value: your key from [console.anthropic.com](https://console.anthropic.com)
- Click **Save** then **Redeploy**

### 4. Install on iPhone
- Open your Vercel URL (e.g. `https://my-pantry.vercel.app`) in **Safari**
- Tap **Share** → **Add to Home Screen**
- Done! 📱

## Supabase Table Setup
```sql
create table pantry_items (
  id text primary key,
  name text not null,
  qty text,
  unit text,
  category text,
  expiry text,
  notes text,
  created_at timestamptz default now()
);

alter table pantry_items enable row level security;
create policy "Allow all" on pantry_items
  for all using (true) with check (true);
```

## Security Notes
- ✅ Anthropic API key: **never in code** — only in Vercel environment variables
- ✅ Supabase anon key: safe to expose (designed to be public, protected by RLS)
- ✅ `.gitignore` prevents any `.env` files from being committed
