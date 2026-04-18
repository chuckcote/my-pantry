// Called by Vercel cron (nightly) and manually from the UI.
// Fetches all pantry items, asks Groq to fix names/units, patches Supabase.

const SUPABASE_URL  = 'https://ntiafbyfrumspcdsedlh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50aWFmYnlmcnVtc3BjZHNlZGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMjM1ODksImV4cCI6MjA5MTc5OTU4OX0.rkcTEKo9y35xWQp8hojbqSpW9oJndYwKUKfq7ygAHg8';

function db(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).end();
  }

  // Vercel cron requests carry Authorization: Bearer $CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${cronSecret}` && req.method !== 'POST') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  // 1. Load all items (only id, name, unit — we don't need qty/expiry)
  const itemsRes = await db('/pantry_items?select=id,name,unit');
  const items = await itemsRes.json();
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(200).json({ updated: 0, corrections: [] });
  }

  // 2. Ask Groq which items need fixing
  const prompt = `You are a food database normalizer. Review these pantry items and fix any that have:
- Abbreviations or slang (OJ, chick, mozza, pb, coke…)
- Inconsistent capitalization
- Vague or unclear names
- Non-standard units (use: pcs, g, kg, ml, L, cups, tbsp, tsp, oz, lbs)

Items:
${items.map(i => `id:${i.id}  name:"${i.name}"  unit:"${i.unit}"`).join('\n')}

Return ONLY a JSON array of items that need changing: [{"id":"...","name":"...","unit":"..."}]
Return [] if everything looks fine. Never invent new items.`;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON. No markdown. No explanation.' },
        { role: 'user',   content: prompt },
      ],
      max_tokens: 1000,
    }),
  });

  const groqData = await groqRes.json();
  const raw = groqData.choices?.[0]?.message?.content || '[]';
  let corrections;
  try {
    corrections = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return res.status(500).json({ error: 'Failed to parse AI response', raw });
  }

  // 3. Patch only the items that need fixing
  for (const fix of corrections) {
    await db(`/pantry_items?id=eq.${fix.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ name: fix.name, unit: fix.unit }),
    });
  }

  console.log(`Normalized ${corrections.length} items:`, corrections.map(c => c.name));
  return res.status(200).json({ updated: corrections.length, corrections });
}
