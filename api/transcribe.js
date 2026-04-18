export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { audio, mimeType } = req.body;
    const buffer = Buffer.from(audio, 'base64');
    const ext    = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';

    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), `recording.${ext}`);
    formData.append('model', 'whisper-large-v3-turbo');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json({ text: data.text });
  } catch (err) {
    console.error('Transcribe error:', err);
    return res.status(500).json({ error: 'Transcription failed' });
  }
}
