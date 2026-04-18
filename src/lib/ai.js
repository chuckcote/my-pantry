const TEXT_MODEL   = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export const PARSE_SYSTEM = `You are a pantry inventory parser.
Return ONLY a valid JSON array. No markdown, no explanation.
Each item: { "name": string, "qty": number, "unit": string, "category": "Fridge"|"Freezer"|"Pantry" }
Default qty=1 if unknown. Use sensible units (eggs→pcs, milk→L, flour→kg). Short clear names. Detect as many items as possible.`;

async function callGroq(body) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`API ${res.status}: ${d.error?.message || JSON.stringify(d)}`);
  return d.choices[0].message.content;
}

export async function claudeText(system, userContent) {
  return callGroq({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: userContent },
    ],
    max_tokens: 2000,
  });
}

export async function claudeVision(system, base64, mediaType, prompt) {
  return callGroq({
    model: VISION_MODEL,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
          { type: 'text', text: prompt },
        ],
      },
    ],
    max_tokens: 2000,
  });
}
