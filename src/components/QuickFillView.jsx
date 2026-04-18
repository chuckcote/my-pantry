import { useState, useRef, useEffect } from 'react';
import { S } from '../styles.js';
import { CATEGORIES, UNITS, CAT_ICONS, CAT_COLORS } from '../config.js';
import { uid, resizeImage } from '../lib/utils.js';
import { claudeText, claudeVision, transcribeAudio, PARSE_SYSTEM } from '../lib/ai.js';

// QuickFillView owns all multi-step fill state — it resets naturally on unmount.
export default function QuickFillView({ onConfirm, onNavigate }) {
  const [step, setStep]         = useState('choose');
  const [category, setCategory] = useState('Fridge');
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState(null);
  const [parsed, setParsed]     = useState([]);
  const [error, setError]       = useState('');
  const [recording, setRecording] = useState(false);
  const [timer, setTimer]         = useState(0);
  const fileRef       = useRef();
  const recorderRef   = useRef();
  const chunksRef     = useRef([]);
  const timerRef      = useRef();

  const parseText = async () => {
    if (!text.trim()) return;
    setLoading(true); setError('');
    try {
      const raw = await claudeText(PARSE_SYSTEM, `Category hint: "${category}". Parse:\n${text}`);
      const data = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setParsed(data.map(p => ({ id: uid(), name: p.name, qty: String(p.qty ?? 1), unit: p.unit || 'pcs', category: p.category || category, expiry: '', notes: '' })));
      setStep('review');
    } catch { setError("Couldn't parse — try rephrasing."); }
    setLoading(false);
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);
        setRecording(false);
        setLoading(true);
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result.split(',')[1]);
            reader.readAsDataURL(blob);
          });
          const transcript = await transcribeAudio(base64, mimeType);
          // Feed transcript into the text parser flow
          const raw = await claudeText(PARSE_SYSTEM, `Category hint: "${category}". Parse:\n${transcript}`);
          const data = JSON.parse(raw.replace(/```json|```/g, '').trim());
          setParsed(data.map(p => ({ id: uid(), name: p.name, qty: String(p.qty ?? 1), unit: p.unit || 'pcs', category: p.category || category, expiry: '', notes: '' })));
          setStep('review');
        } catch (err) { setError(`Failed: ${err.message}`); setStep('record'); }
        setLoading(false);
      };
      recorder.start();
      setRecording(true);
      setTimer(0);
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch { setError('Microphone access denied. Please allow microphone and try again.'); }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const handlePhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setPreview(dataUrl);
      setStep('photo');
      setLoading(true); setError('');
      try {
        const resized = await resizeImage(dataUrl);
        const raw = await claudeVision(PARSE_SYSTEM, resized.split(',')[1], 'image/jpeg',
          `Photo of my ${category}. List all visible food items as JSON.`);
        const data = JSON.parse(raw.replace(/```json|```/g, '').trim());
        setParsed(data.map(p => ({ id: uid(), name: p.name, qty: String(p.qty ?? 1), unit: p.unit || 'pcs', category: p.category || category, expiry: '', notes: '' })));
        setStep('review');
      } catch (err) { console.error('Photo scan error:', err); setError(`Scan failed: ${err.message || err}`); }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const confirmParsed = async () => {
    const toAdd = parsed.filter(p => !p._skip);
    await onConfirm(toAdd);
    setParsed([]); setText(''); setPreview(null);
    setStep('done');
  };

  return (
    <main style={S.main}>
      {step === 'choose' && (
        <div style={S.card}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>⚡ Quick Fill</div>
          <div style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Fill your pantry in seconds — type a list or snap a photo.</div>
          <div style={{ marginBottom: 20 }}>
            <div style={S.qfLabel}>Where are you stocking?</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ ...S.catPill, ...(category === cat ? S.catPillActive : {}) }} className="cat-pill">
                  {CAT_ICONS[cat]} {cat}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <button style={S.methodCard} className="method-card" onClick={() => setStep('type')}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⌨️</div>
              <div style={S.methodTitle}>Type</div>
              <div style={S.methodSub}>Type a list of items</div>
            </button>
            <button style={S.methodCard} className="method-card" onClick={() => { setRecording(false); setTimer(0); setError(''); setStep('record'); }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎤</div>
              <div style={S.methodTitle}>Voice</div>
              <div style={S.methodSub}>Say what's in your pantry</div>
            </button>
            <button style={S.methodCard} className="method-card" onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={S.methodTitle}>Photo</div>
              <div style={S.methodSub}>Scan a shelf photo</div>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => handlePhoto(e.target.files[0])} />
        </div>
      )}

      {step === 'record' && (
        <div style={S.card}>
          <button style={S.backBtn} onClick={() => { stopRecording(); setStep('choose'); }} className="back-btn">← Back</button>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, margin: '12px 0 6px' }}>{CAT_ICONS[category]} {category}</div>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 28 }}>
            {recording ? 'Listening… tap to stop when done.' : loading ? 'Transcribing your voice…' : 'Tap the mic and list what\'s in your pantry out loud.'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={loading}
              className={recording ? 'mic-recording' : ''}
              style={{ width: 88, height: 88, borderRadius: '50%', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 36, background: recording ? '#c0392b' : '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.5 : 1 }}
            >
              {recording ? '⏹' : '🎤'}
            </button>
            {recording && (
              <div style={{ color: '#c0392b', fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>
                ● {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
              </div>
            )}
            {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#888', fontSize: 13 }}><div style={S.spinner} />Transcribing…</div>}
          </div>
          {error && <div style={{ ...S.errorMsg, marginTop: 24 }}>{error}</div>}
        </div>
      )}

      {step === 'type' && (
        <div style={S.card}>
          <button style={S.backBtn} onClick={() => setStep('choose')} className="back-btn">← Back</button>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, margin: '12px 0 6px' }}>{CAT_ICONS[category]} {category}</div>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>Type anything naturally — I'll figure out quantities and units.</div>
          <div style={S.exampleBox}>💡 <em>"6 eggs, half a block of cheddar, 2 litres of whole milk, some butter, 3 yoghurts"</em></div>
          <textarea style={S.textarea} placeholder={`What's in your ${category.toLowerCase()}?`} value={text}
            onChange={e => setText(e.target.value)} rows={6} />
          {error && <div style={S.errorMsg}>{error}</div>}
          <button style={{ ...S.bigBtn, marginTop: 12 }} className="big-btn" onClick={parseText} disabled={loading || !text.trim()}>
            {loading ? 'Parsing…' : '✨ Parse my list'}
          </button>
          {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, color: '#888', fontSize: 13 }}><div style={S.spinner} />Analysing…</div>}
        </div>
      )}

      {step === 'photo' && (
        <div style={S.card}>
          {preview && <img src={preview} alt="preview" style={S.photoPreview} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, color: '#555' }}>
            <div style={S.spinner} /><span>Scanning your {category.toLowerCase()} photo…</span>
          </div>
          {error && <>
            <div style={S.errorMsg}>{error}</div>
            <button style={S.backBtn} onClick={() => setStep('choose')} className="back-btn">← Try another method</button>
          </>}
        </div>
      )}

      {step === 'review' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700 }}>Review & confirm</div>
            <span style={{ color: '#888', fontSize: 13 }}>{parsed.filter(p => !p._skip).length} items</span>
          </div>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Uncheck anything wrong, edit inline, then confirm.</div>
          {CATEGORIES.map(cat => {
            const catP = parsed.filter(p => p.category === cat);
            if (!catP.length) return null;
            const c = CAT_COLORS[cat];
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: c.accent, marginBottom: 8 }}>{CAT_ICONS[cat]} {cat}</div>
                {catP.map(p => (
                  <div key={p.id} style={{ ...S.reviewRow, opacity: p._skip ? 0.35 : 1 }}>
                    <input type="checkbox" checked={!p._skip} style={{ accentColor: '#1a1a2e', width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                      onChange={() => setParsed(prev => prev.map(x => x.id === p.id ? { ...x, _skip: !x._skip } : x))} />
                    <input style={S.reviewName} value={p.name}
                      onChange={e => setParsed(prev => prev.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))} />
                    <input style={S.reviewQty} type="number" min="0" value={p.qty}
                      onChange={e => setParsed(prev => prev.map(x => x.id === p.id ? { ...x, qty: e.target.value } : x))} />
                    <select style={S.reviewUnit} value={p.unit}
                      onChange={e => setParsed(prev => prev.map(x => x.id === p.id ? { ...x, unit: e.target.value } : x))}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                    <select style={S.reviewCat} value={p.category}
                      onChange={e => setParsed(prev => prev.map(x => x.id === p.id ? { ...x, category: e.target.value } : x))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button style={S.cancelBtn} onClick={() => setStep('choose')}>← Redo</button>
            <button style={{ ...S.bigBtn, flex: 1 }} className="big-btn" onClick={confirmParsed}>
              ✅ Add {parsed.filter(p => !p._skip).length} items
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 8 }}>Pantry updated!</div>
          <div style={{ color: '#666', marginBottom: 24 }}>Saved to the cloud. Fill another section?</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} style={S.catPill} className="cat-pill" onClick={() => { setCategory(cat); setStep('choose'); }}>
                {CAT_ICONS[cat]} Fill {cat}
              </button>
            ))}
          </div>
          <button style={{ ...S.bigBtn, marginTop: 20 }} className="big-btn" onClick={() => onNavigate('home')}>View my pantry →</button>
        </div>
      )}
    </main>
  );
}
