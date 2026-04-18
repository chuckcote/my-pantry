export const PARSE_SYSTEM = `You are a pantry inventory parser.
Return ONLY a valid JSON array. No markdown, no explanation.
Each item: { "name": string, "qty": number, "unit": string, "category": "Fridge"|"Freezer"|"Pantry" }
Default qty=1 if unknown. Use sensible units (eggs→pcs, milk→L, flour→kg). Short clear names. Detect as many items as possible.`;

async function callGemini(body) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`API ${res.status}: ${d.error?.message || JSON.stringify(d)}`);
  return d.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
}

export async function claudeText(system, userContent) {
  return callGemini({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ parts: [{ text: userContent }] }],
    generationConfig: { maxOutputTokens: 2000 },
  });
}

export async function claudeVision(system, base64, mediaType, prompt) {
  return callGemini({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ parts: [
      { inline_data: { mime_type: mediaType, data: base64 } },
      { text: prompt },
    ]}],
    generationConfig: { maxOutputTokens: 2000 },
  });
}
