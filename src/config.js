// Supabase anon keys are safe to expose — designed to be public.
// The Gemini key lives server-side in /api/chat.js via Vercel env vars.
export const SUPABASE_URL  = 'https://ntiafbyfrumspcdsedlh.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50aWFmYnlmcnVtc3BjZHNlZGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMjM1ODksImV4cCI6MjA5MTc5OTU4OX0.rkcTEKo9y35xWQp8hojbqSpW9oJndYwKUKfq7ygAHg8';

export const CATEGORIES = ['Fridge', 'Freezer', 'Pantry'];
export const UNITS      = ['pcs','g','kg','ml','L','cups','tbsp','tsp','oz','lbs'];
export const CAT_ICONS  = { Fridge: '🧊', Freezer: '❄️', Pantry: '🫙' };
export const CAT_COLORS = {
  Fridge:  { bg: '#e8f4fd', border: '#b3d8f5', accent: '#2e86c1' },
  Freezer: { bg: '#edf2fb', border: '#b0c4e8', accent: '#3c5a9a' },
  Pantry:  { bg: '#fdf6ec', border: '#f0d9b0', accent: '#b07d2e' },
};
