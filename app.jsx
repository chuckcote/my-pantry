// ── config — NO secrets here, all safe to commit ─────────────────────────────
const SUPABASE_URL  = 'https://ntiafbyfrumspcdsedlh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50aWFmYnlmcnVtc3BjZHNlZGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMjM1ODksImV4cCI6MjA5MTc5OTU4OX0.rkcTEKo9y35xWQp8hojbqSpW9oJndYwKUKfq7ygAHg8';

// Supabase anon keys are safe to expose — they're designed to be public.
// The Anthropic key is kept secret on the server in /api/chat.js via Vercel env vars.

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['Fridge', 'Freezer', 'Pantry'];
const UNITS      = ['pcs','g','kg','ml','L','cups','tbsp','tsp','oz','lbs'];
const CAT_ICONS  = { Fridge:'🧊', Freezer:'❄️', Pantry:'🫙' };
const CAT_COLORS = {
  Fridge:  { bg:'#e8f4fd', border:'#b3d8f5', accent:'#2e86c1' },
  Freezer: { bg:'#edf2fb', border:'#b0c4e8', accent:'#3c5a9a' },
  Pantry:  { bg:'#fdf6ec', border:'#f0d9b0', accent:'#b07d2e' },
};

// ── helpers ───────────────────────────────────────────────────────────────────
const uid        = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const daysUntil  = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const expiryInfo = (dateStr) => {
  const d = daysUntil(dateStr);
  if (d === null) return null;
  if (d < 0)  return { label:`Expired ${Math.abs(d)}d ago`, color:'#c0392b', bg:'#fdecea' };
  if (d === 0) return { label:'Expires today!',             color:'#c0392b', bg:'#fdecea' };
  if (d <= 3)  return { label:`${d}d left`,                 color:'#d35400', bg:'#fef3e2' };
  if (d <= 7)  return { label:`${d}d left`,                 color:'#b7950b', bg:'#fefde7' };
  return { label:`${d}d`, color:'#1e8449', bg:'#eafaf1' };
};
const pantryText = (items) =>
  items.map(it => `- ${it.name}: ${it.qty} ${it.unit} [${it.category}]${it.expiry ? ` expires ${it.expiry}` : ''}`).join('\n');

// ── image resizer — shrinks photos before sending to Claude ──────────────────
async function resizeImage(dataUrl, maxDim = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

// ── AI proxy — calls our own /api/chat, no key in browser ────────────────────
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

async function claudeText(system, userContent) {
  return callGemini({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ parts: [{ text: userContent }] }],
    generationConfig: { maxOutputTokens: 2000 },
  });
}

async function claudeVision(system, base64, mediaType, prompt) {
  return callGemini({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ parts: [
      { inline_data: { mime_type: mediaType, data: base64 } },
      { text: prompt },
    ]}],
    generationConfig: { maxOutputTokens: 2000 },
  });
}

const PARSE_SYSTEM = `You are a pantry inventory parser.
Return ONLY a valid JSON array. No markdown, no explanation.
Each item: { "name": string, "qty": number, "unit": string, "category": "Fridge"|"Freezer"|"Pantry" }
Default qty=1 if unknown. Use sensible units (eggs→pcs, milk→L, flour→kg). Short clear names. Detect as many items as possible.`;

// ── Supabase DB ───────────────────────────────────────────────────────────────
const DB = {
  async load() {
    const { data, error } = await db.from('pantry_items').select('*').order('created_at');
    if (error) { console.error(error); return []; }
    return data || [];
  },
  async insert(item)        { const { error } = await db.from('pantry_items').insert([item]);             if (error) console.error(error); },
  async update(id, fields)  { const { error } = await db.from('pantry_items').update(fields).eq('id',id); if (error) console.error(error); },
  async remove(id)          { const { error } = await db.from('pantry_items').delete().eq('id',id);        if (error) console.error(error); },
  async bulkInsert(items)   { const { error } = await db.from('pantry_items').insert(items);               if (error) console.error(error); },
};

const blank = (cat='Fridge') => ({ id:uid(), name:'', qty:'1', unit:'pcs', category:cat, expiry:'', notes:'' });

// ══════════════════════════════════════════════════════════════════════════════
const { useState, useEffect, useCallback, useRef } = React;

function App() {
  const [items,   setItems]   = useState([]);
  const [ready,   setReady]   = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [view,    setView]    = useState('home');
  const [form,    setForm]    = useState(null);
  const [ai,      setAi]      = useState({ loading:false, recipes:null, selectedRecipe:null });

  const [qfStep,     setQfStep]     = useState('choose');
  const [qfCategory, setQfCategory] = useState('Fridge');
  const [qfText,     setQfText]     = useState('');
  const [qfLoading,  setQfLoading]  = useState(false);
  const [qfPreview,  setQfPreview]  = useState(null);
  const [qfParsed,   setQfParsed]   = useState([]);
  const [qfError,    setQfError]    = useState('');
  const fileRef = useRef();

  useEffect(() => {
    DB.load().then(data => {
      setItems(data);
      setReady(true);
      const splash = document.getElementById('splash');
      if (splash) { splash.classList.add('hidden'); setTimeout(() => splash.remove(), 500); }
    });
  }, []);

  useEffect(() => {
    const channel = db.channel('pantry-realtime')
      .on('postgres_changes', { event:'*', schema:'public', table:'pantry_items' }, () => DB.load().then(setItems))
      .subscribe();
    return () => db.removeChannel(channel);
  }, []);

  const saveForm = async () => {
    if (!form?.name?.trim()) return;
    setSyncing(true);
    if (form._isNew) { const { _isNew, ...item } = form; await DB.insert(item); }
    else             { const { _isNew, ...fields } = form; await DB.update(form.id, fields); }
    setForm(null); setSyncing(false);
  };

  const del = async (id) => { setItems(p => p.filter(it => it.id !== id)); await DB.remove(id); };

  const nudgeQty = async (id, delta) => {
    const item = items.find(it => it.id === id);
    if (!item) return;
    const newQty = String(Math.max(0, (parseFloat(item.qty)||0) + delta));
    setItems(p => p.map(it => it.id===id ? {...it, qty:newQty} : it));
    await DB.update(id, { qty: newQty });
  };

  const alerts = items.filter(it => { const d = daysUntil(it.expiry); return d !== null && d <= 3; });

  const parseText = async () => {
    if (!qfText.trim()) return;
    setQfLoading(true); setQfError('');
    try {
      const raw = await claudeText(PARSE_SYSTEM, `Category hint: "${qfCategory}". Parse:\n${qfText}`);
      const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
      setQfParsed(parsed.map(p => ({ id:uid(), name:p.name, qty:String(p.qty??1), unit:p.unit||'pcs', category:p.category||qfCategory, expiry:'', notes:'' })));
      setQfStep('review');
    } catch { setQfError("Couldn't parse — try rephrasing."); }
    setQfLoading(false);
  };

  const handlePhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setQfPreview(dataUrl);
      setQfStep('photo');
      setQfLoading(true); setQfError('');
      try {
        const resized = await resizeImage(dataUrl);
        const raw = await claudeVision(PARSE_SYSTEM, resized.split(',')[1], 'image/jpeg',
          `Photo of my ${qfCategory}. List all visible food items as JSON.`);
        const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
        setQfParsed(parsed.map(p => ({ id:uid(), name:p.name, qty:String(p.qty??1), unit:p.unit||'pcs', category:p.category||qfCategory, expiry:'', notes:'' })));
        setQfStep('review');
      } catch (err) { console.error('Photo scan error:', err); setQfError(`Scan failed: ${err.message || err}`); }
      setQfLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const confirmParsed = async () => {
    const toAdd = qfParsed.filter(p => !p._skip);
    setItems(p => [...p, ...toAdd]);
    await DB.bulkInsert(toAdd);
    setQfParsed([]); setQfText(''); setQfPreview(null);
    setQfStep('done');
  };

  const resetQf = () => { setQfStep('choose'); setQfText(''); setQfPreview(null); setQfParsed([]); setQfError(''); };

  const getRecipes = async () => {
    setAi({ loading:true, recipes:null, selectedRecipe:null });
    try {
      const raw = await claudeText(
        'You are a home chef. Return EXACTLY 3 recipes as a JSON array. Each: { "title", "time", "description"(1 sentence), "steps"(4-6 strings), "uses":[{"name","amount","unit"}] }. ONLY valid JSON, no markdown.',
        `My pantry:\n${pantryText(items)}\nSuggest 3 recipes.`
      );
      setAi({ loading:false, recipes:JSON.parse(raw.replace(/```json|```/g,'').trim()), selectedRecipe:null });
    } catch { setAi({ loading:false, recipes:[], selectedRecipe:null }); }
  };

  const cookRecipe = async (recipe) => {
    const updates = [];
    const next = items.map(it => {
      const use = recipe.uses?.find(u => u.name.toLowerCase()===it.name.toLowerCase());
      if (!use) return it;
      const newQty = String(Math.max(0,(parseFloat(it.qty)||0)-(use.amount||0)));
      updates.push(DB.update(it.id, { qty:newQty }));
      return { ...it, qty:newQty };
    });
    setItems(next); await Promise.all(updates);
    setAi({ loading:false, recipes:null, selectedRecipe:null }); setView('home');
  };

  if (!ready) return null;

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      <header style={S.header}>
        <div style={S.brand}>
          <span style={{ fontSize:26 }}>🥘</span>
          <div>
            <div style={S.brandName}>My Pantry</div>
            <div style={S.brandSub}>{items.length} items {syncing ? '· saving…' : '· synced ☁️'}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          {alerts.length > 0 && <div style={S.alertChip}>⚠️ {alerts.length}</div>}
          <nav style={S.nav}>
            {[['home','Pantry'],['quickfill','⚡ Fill'],['ai','🍳 Recipes']].map(([v,label]) => (
              <button key={v} style={{ ...S.navBtn, ...(view===v?S.navActive:{}) }}
                onClick={() => { setView(v); if(v==='quickfill') resetQf(); }}>{label}</button>
            ))}
          </nav>
        </div>
      </header>

      {alerts.length > 0 && view==='home' && (
        <div style={S.expiryBanner}>
          <strong style={{ marginRight:8, flexShrink:0 }}>Use soon:</strong>
          {alerts.map(a => { const info=expiryInfo(a.expiry); return (
            <span key={a.id} style={{ ...S.pill, background:info.bg, color:info.color }}>{a.name} · {info.label}</span>
          );})}
        </div>
      )}

      {/* ── PANTRY ── */}
      {view==='home' && (
        <main style={S.main}>
          {items.length===0 && (
            <div style={S.emptyState}>
              <div style={{ fontSize:56, marginBottom:12 }}>🛒</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, marginBottom:8 }}>Your pantry is empty</div>
              <div style={{ color:'#888', marginBottom:20 }}>Use ⚡ Quick Fill to add everything at once!</div>
              <button style={S.bigBtn} className="big-btn" onClick={() => { setView('quickfill'); resetQf(); }}>⚡ Quick Fill my pantry</button>
            </div>
          )}
          {CATEGORIES.map(cat => {
            const catItems = items.filter(it => it.category===cat);
            const c = CAT_COLORS[cat];
            return (
              <section key={cat} style={{ ...S.section, background:c.bg, borderColor:c.border }}>
                <div style={S.sectionHead}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:17 }}>
                    <span style={{ fontSize:22 }}>{CAT_ICONS[cat]}</span>
                    <span style={{ color:c.accent, fontWeight:700 }}>{cat}</span>
                    <span style={{ ...S.badge, background:c.border, color:c.accent }}>{catItems.length}</span>
                  </div>
                  <button style={{ ...S.addBtn, color:c.accent, borderColor:c.border }} className="btn-add"
                    onClick={() => setForm({...blank(cat),_isNew:true})}>+ Add</button>
                </div>
                {catItems.length===0
                  ? <div style={S.emptyRow}>Nothing here yet</div>
                  : catItems.map(it => {
                      const exp = expiryInfo(it.expiry);
                      return (
                        <div key={it.id} style={S.row} className="item-row">
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={S.rowName}>{it.name}</div>
                            {exp && <span style={{ ...S.pill, background:exp.bg, color:exp.color, fontSize:11, fontWeight:700, marginTop:3, display:'inline-block', padding:'2px 8px' }}>{exp.label}</span>}
                            {it.notes && <div style={S.rowNotes}>{it.notes}</div>}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                            <button style={S.qBtn} onClick={() => nudgeQty(it.id,-1)} className="q-btn">−</button>
                            <span style={S.qtyLabel}>{it.qty} {it.unit}</span>
                            <button style={S.qBtn} onClick={() => nudgeQty(it.id,1)}  className="q-btn">+</button>
                            <button style={S.iconBtn} onClick={() => setForm({...it,_isNew:false})} title="Edit">✏️</button>
                            <button style={S.iconBtn} onClick={() => del(it.id)} title="Delete">×</button>
                          </div>
                        </div>
                      );
                    })}
              </section>
            );
          })}
        </main>
      )}

      {/* ── QUICK FILL ── */}
      {view==='quickfill' && (
        <main style={S.main}>
          {qfStep==='choose' && (
            <div style={S.card}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, marginBottom:6 }}>⚡ Quick Fill</div>
              <div style={{ color:'#666', fontSize:14, marginBottom:20 }}>Fill your pantry in seconds — type a list or snap a photo.</div>
              <div style={{ marginBottom:20 }}>
                <div style={S.qfLabel}>Where are you stocking?</div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setQfCategory(cat)}
                      style={{ ...S.catPill, ...(qfCategory===cat?S.catPillActive:{}) }} className="cat-pill">
                      {CAT_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <button style={S.methodCard} className="method-card" onClick={() => setQfStep('type')}>
                  <div style={{ fontSize:36, marginBottom:8 }}>⌨️</div>
                  <div style={S.methodTitle}>Type a list</div>
                  <div style={S.methodSub}>"6 eggs, 2L milk, some butter…"</div>
                </button>
                <button style={S.methodCard} className="method-card" onClick={() => fileRef.current?.click()}>
                  <div style={{ fontSize:36, marginBottom:8 }}>📷</div>
                  <div style={S.methodTitle}>Scan photo</div>
                  <div style={S.methodSub}>Point camera at shelf — I'll detect everything</div>
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => handlePhoto(e.target.files[0])} />
            </div>
          )}

          {qfStep==='type' && (
            <div style={S.card}>
              <button style={S.backBtn} onClick={() => setQfStep('choose')} className="back-btn">← Back</button>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, margin:'12px 0 6px' }}>{CAT_ICONS[qfCategory]} {qfCategory}</div>
              <div style={{ color:'#666', fontSize:13, marginBottom:12 }}>Type anything naturally — I'll figure out quantities and units.</div>
              <div style={S.exampleBox}>💡 <em>"6 eggs, half a block of cheddar, 2 litres of whole milk, some butter, 3 yoghurts"</em></div>
              <textarea style={S.textarea} placeholder={`What's in your ${qfCategory.toLowerCase()}?`} value={qfText} onChange={e=>setQfText(e.target.value)} rows={6} />
              {qfError && <div style={S.errorMsg}>{qfError}</div>}
              <button style={{ ...S.bigBtn, marginTop:12 }} className="big-btn" onClick={parseText} disabled={qfLoading||!qfText.trim()}>
                {qfLoading ? 'Parsing…' : '✨ Parse my list'}
              </button>
              {qfLoading && <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:14, color:'#888', fontSize:13 }}><div style={S.spinner}/>Analysing…</div>}
            </div>
          )}

          {qfStep==='photo' && (
            <div style={S.card}>
              {qfPreview && <img src={qfPreview} alt="preview" style={S.photoPreview} />}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16, color:'#555' }}>
                <div style={S.spinner}/><span>Scanning your {qfCategory.toLowerCase()} photo…</span>
              </div>
              {qfError && <>
                <div style={S.errorMsg}>{qfError}</div>
                <button style={S.backBtn} onClick={() => setQfStep('choose')} className="back-btn">← Try another method</button>
              </>}
            </div>
          )}

          {qfStep==='review' && (
            <div style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700 }}>Review & confirm</div>
                <span style={{ color:'#888', fontSize:13 }}>{qfParsed.filter(p=>!p._skip).length} items</span>
              </div>
              <div style={{ color:'#666', fontSize:13, marginBottom:16 }}>Uncheck anything wrong, edit inline, then confirm.</div>
              {CATEGORIES.map(cat => {
                const catP = qfParsed.filter(p => p.category===cat);
                if (!catP.length) return null;
                const c = CAT_COLORS[cat];
                return (
                  <div key={cat} style={{ marginBottom:16 }}>
                    <div style={{ fontWeight:800, fontSize:11, textTransform:'uppercase', letterSpacing:1, color:c.accent, marginBottom:8 }}>{CAT_ICONS[cat]} {cat}</div>
                    {catP.map(p => (
                      <div key={p.id} style={{ ...S.reviewRow, opacity:p._skip?0.35:1 }}>
                        <input type="checkbox" checked={!p._skip} style={{ accentColor:'#1a1a2e', width:16, height:16, cursor:'pointer', flexShrink:0 }}
                          onChange={() => setQfParsed(prev => prev.map(x => x.id===p.id?{...x,_skip:!x._skip}:x))} />
                        <input style={S.reviewName} value={p.name} onChange={e=>setQfParsed(prev=>prev.map(x=>x.id===p.id?{...x,name:e.target.value}:x))} />
                        <input style={S.reviewQty} type="number" min="0" value={p.qty} onChange={e=>setQfParsed(prev=>prev.map(x=>x.id===p.id?{...x,qty:e.target.value}:x))} />
                        <select style={S.reviewUnit} value={p.unit} onChange={e=>setQfParsed(prev=>prev.map(x=>x.id===p.id?{...x,unit:e.target.value}:x))}>
                          {UNITS.map(u=><option key={u}>{u}</option>)}
                        </select>
                        <select style={S.reviewCat} value={p.category} onChange={e=>setQfParsed(prev=>prev.map(x=>x.id===p.id?{...x,category:e.target.value}:x))}>
                          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                );
              })}
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button style={S.cancelBtn} onClick={() => setQfStep('choose')}>← Redo</button>
                <button style={{ ...S.bigBtn, flex:1 }} className="big-btn" onClick={confirmParsed}>
                  ✅ Add {qfParsed.filter(p=>!p._skip).length} items
                </button>
              </div>
            </div>
          )}

          {qfStep==='done' && (
            <div style={{ ...S.card, textAlign:'center' }}>
              <div style={{ fontSize:52, marginBottom:12 }}>🎉</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, marginBottom:8 }}>Pantry updated!</div>
              <div style={{ color:'#666', marginBottom:24 }}>Saved to the cloud. Fill another section?</div>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} style={S.catPill} className="cat-pill" onClick={() => { setQfCategory(cat); setQfStep('choose'); }}>
                    {CAT_ICONS[cat]} Fill {cat}
                  </button>
                ))}
              </div>
              <button style={{ ...S.bigBtn, marginTop:20 }} className="big-btn" onClick={() => setView('home')}>View my pantry →</button>
            </div>
          )}
        </main>
      )}

      {/* ── RECIPES ── */}
      {view==='ai' && (
        <main style={S.main}>
          {!ai.selectedRecipe ? (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={S.card}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700 }}>What can I cook today?</div>
                <div style={{ color:'#666', fontSize:14, margin:'8px 0 20px' }}>I'll check your full pantry and suggest recipes you can make now.</div>
                <button style={S.bigBtn} className="big-btn" onClick={getRecipes} disabled={ai.loading||items.length===0}>
                  {ai.loading ? 'Finding recipes…' : '✨ Suggest Recipes'}
                </button>
                {items.length===0 && <p style={{ color:'#aaa', fontSize:13, marginTop:12 }}>Add items first.</p>}
              </div>
              {ai.loading && <div style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'center', padding:24 }}><div style={S.spinner}/><span style={{ color:'#888' }}>Checking your pantry…</span></div>}
              {ai.recipes?.map((r,i) => (
                <div key={i} style={S.recipeCard} className="recipe-card" onClick={() => setAi(a=>({...a,selectedRecipe:r}))}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>{r.title}</div>
                    <div style={{ color:'#888', fontSize:13 }}>⏱ {r.time}</div>
                  </div>
                  <div style={{ color:'#555', fontSize:14, marginBottom:12 }}>{r.description}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                    {r.uses?.map((u,j) => {
                      const have = items.find(it=>it.name.toLowerCase()===u.name.toLowerCase());
                      return <span key={j} style={{ ...S.chip, ...(have?S.haveChip:S.missingChip) }}>{have?'✓':'✗'} {u.name}</span>;
                    })}
                  </div>
                  <div style={{ color:'#1a1a2e', fontSize:13, fontWeight:700 }}>View recipe & cook →</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <button style={S.backBtn} onClick={() => setAi(a=>({...a,selectedRecipe:null}))} className="back-btn">← Back</button>
              <div style={S.card}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700 }}>{ai.selectedRecipe.title}</div>
                <div style={{ color:'#888', fontSize:14, marginBottom:8 }}>⏱ {ai.selectedRecipe.time}</div>
                <div style={{ color:'#555', fontSize:15, marginBottom:20 }}>{ai.selectedRecipe.description}</div>
                <div style={S.sectionLabel}>Ingredients</div>
                {ai.selectedRecipe.uses?.map((u,i) => {
                  const have = items.find(it=>it.name.toLowerCase()===u.name.toLowerCase());
                  return <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', fontSize:15, borderBottom:'1px solid #f5f5f5', opacity:have?1:0.5 }}>
                    <span>{have?'✅':'❌'}</span><span style={{ fontWeight:600 }}>{u.amount} {u.unit} {u.name}</span>
                    {!have && <span style={{ color:'#c0392b', fontSize:12 }}>(not in pantry)</span>}
                  </div>;
                })}
                <div style={S.sectionLabel}>Steps</div>
                {ai.selectedRecipe.steps?.map((step,i) => (
                  <div key={i} style={{ display:'flex', gap:14, alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid #f5f5f5' }}>
                    <span style={{ background:'#1a1a2e', color:'#e8c97e', borderRadius:'50%', width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, flexShrink:0 }}>{i+1}</span>
                    <span style={{ fontSize:14, lineHeight:1.6 }}>{step}</span>
                  </div>
                ))}
                <button style={{ ...S.bigBtn, width:'100%', marginTop:28 }} className="big-btn" onClick={() => cookRecipe(ai.selectedRecipe)}>
                  ✅ I cooked this! Deduct ingredients
                </button>
                <div style={{ textAlign:'center', color:'#aaa', fontSize:12, marginTop:8 }}>Quantities updated in the cloud automatically.</div>
              </div>
            </div>
          )}
        </main>
      )}

      {form && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setForm(null)}>
          <div style={S.modal}>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, margin:'0 0 18px' }}>
              {form._isNew ? `Add to ${form.category}` : 'Edit item'}
            </h3>
            <label style={S.lbl}>Name<input style={S.inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Chicken breast" autoFocus /></label>
            <label style={S.lbl}>Location<select style={S.inp} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
            <div style={{ display:'flex', gap:10 }}>
              <label style={{ ...S.lbl, flex:1 }}>Qty<input style={S.inp} type="number" min="0" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))} /></label>
              <label style={{ ...S.lbl, width:90 }}>Unit<select style={S.inp} value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></label>
            </div>
            <label style={S.lbl}>Expiry<input style={S.inp} type="date" value={form.expiry||''} onChange={e=>setForm(f=>({...f,expiry:e.target.value}))} /></label>
            <label style={S.lbl}>Notes<input style={S.inp} value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional" /></label>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:6 }}>
              <button style={S.cancelBtn} onClick={()=>setForm(null)}>Cancel</button>
              <button style={{ ...S.bigBtn, padding:'10px 24px', fontSize:14 }} className="big-btn" onClick={saveForm}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  root:         { minHeight:'100vh', background:'#f7f5f0', fontFamily:"'Nunito',sans-serif", color:'#222' },
  header:       { background:'#1a1a2e', color:'#fff', padding:'12px 16px', paddingTop:'calc(12px + env(safe-area-inset-top))', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:50, flexWrap:'wrap', gap:8 },
  brand:        { display:'flex', alignItems:'center', gap:10 },
  brandName:    { fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, lineHeight:1 },
  brandSub:     { fontSize:11, color:'#aaa', marginTop:2 },
  alertChip:    { background:'#c0392b', color:'#fff', borderRadius:20, padding:'4px 10px', fontSize:12, fontWeight:700 },
  nav:          { display:'flex', background:'#2a2a40', borderRadius:8, overflow:'hidden' },
  navBtn:       { padding:'7px 12px', border:'none', background:'transparent', color:'#aaa', fontSize:12, fontWeight:600, cursor:'pointer' },
  navActive:    { background:'#e8c97e', color:'#1a1a2e' },
  expiryBanner: { background:'#fff8e1', borderBottom:'1px solid #ffe082', padding:'10px 16px', fontSize:13, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' },
  pill:         { borderRadius:20, padding:'3px 10px', fontWeight:700, fontSize:12 },
  main:         { padding:'14px 16px', maxWidth:800, margin:'0 auto', display:'flex', flexDirection:'column', gap:14 },
  emptyState:   { background:'#fff', borderRadius:16, padding:'48px 24px', textAlign:'center', border:'1.5px solid #eee' },
  section:      { borderRadius:14, border:'1.5px solid', padding:'14px 16px' },
  sectionHead:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  badge:        { borderRadius:20, padding:'2px 9px', fontSize:12, fontWeight:700 },
  addBtn:       { border:'1.5px solid', borderRadius:8, background:'transparent', padding:'5px 12px', fontSize:13, fontWeight:700, cursor:'pointer' },
  emptyRow:     { color:'#bbb', fontSize:13, textAlign:'center', padding:'12px 0' },
  row:          { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderTop:'1px solid rgba(0,0,0,0.06)' },
  rowName:      { fontWeight:700, fontSize:15 },
  rowNotes:     { fontSize:12, color:'#888', marginTop:2 },
  qBtn:         { width:28, height:28, borderRadius:'50%', border:'1.5px solid #ddd', background:'#fff', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 },
  qtyLabel:     { minWidth:68, textAlign:'center', fontWeight:600, fontSize:14 },
  iconBtn:      { background:'none', border:'none', cursor:'pointer', fontSize:15, padding:'2px 4px', opacity:0.55, lineHeight:1 },
  card:         { background:'#fff', border:'1.5px solid #eee', borderRadius:16, padding:'22px 20px' },
  qfLabel:      { fontWeight:800, fontSize:12, textTransform:'uppercase', letterSpacing:0.8, color:'#aaa', marginBottom:10 },
  catPill:      { padding:'9px 16px', borderRadius:10, border:'1.5px solid #ddd', background:'#fafafa', fontSize:14, fontWeight:700, cursor:'pointer', color:'#555' },
  catPillActive:{ background:'#1a1a2e', color:'#e8c97e', borderColor:'#1a1a2e' },
  methodCard:   { background:'#fafafa', border:'2px solid #eee', borderRadius:14, padding:'22px 16px', textAlign:'center', cursor:'pointer' },
  methodTitle:  { fontWeight:800, fontSize:15, marginBottom:6 },
  methodSub:    { color:'#888', fontSize:13, lineHeight:1.5 },
  exampleBox:   { background:'#f7f5f0', border:'1px solid #e8e0d0', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#666', marginBottom:12, lineHeight:1.6 },
  textarea:     { width:'100%', padding:'12px 14px', border:'1.5px solid #ddd', borderRadius:10, fontSize:14, color:'#222', background:'#fafafa', resize:'vertical', fontFamily:"'Nunito',sans-serif", boxSizing:'border-box' },
  errorMsg:     { color:'#c0392b', fontSize:13, marginTop:8 },
  photoPreview: { width:'100%', maxHeight:240, objectFit:'cover', borderRadius:10 },
  reviewRow:    { display:'flex', alignItems:'center', gap:6, padding:'6px 0', borderBottom:'1px solid #f0f0f0' },
  reviewName:   { flex:1, padding:'5px 8px', border:'1px solid #ddd', borderRadius:6, fontSize:13, color:'#222', minWidth:0 },
  reviewQty:    { width:52, padding:'5px 6px', border:'1px solid #ddd', borderRadius:6, fontSize:13, textAlign:'center' },
  reviewUnit:   { width:58, padding:'5px 3px', border:'1px solid #ddd', borderRadius:6, fontSize:12 },
  reviewCat:    { width:76, padding:'5px 3px', border:'1px solid #ddd', borderRadius:6, fontSize:12 },
  bigBtn:       { padding:'13px 28px', background:'#1a1a2e', color:'#e8c97e', border:'none', borderRadius:10, fontSize:15, fontWeight:800, cursor:'pointer', letterSpacing:0.3 },
  spinner:      { width:20, height:20, border:'3px solid #eee', borderTop:'3px solid #1a1a2e', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 },
  backBtn:      { background:'none', border:'none', color:'#1a1a2e', fontSize:14, fontWeight:700, cursor:'pointer', padding:0, alignSelf:'flex-start' },
  cancelBtn:    { padding:'10px 16px', border:'1.5px solid #ddd', borderRadius:8, background:'none', cursor:'pointer', fontSize:14, color:'#555' },
  recipeCard:   { background:'#fff', border:'1.5px solid #eee', borderRadius:14, padding:'16px 18px', cursor:'pointer' },
  chip:         { borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600 },
  haveChip:     { background:'#eafaf1', color:'#1e8449' },
  missingChip:  { background:'#fdecea', color:'#c0392b' },
  sectionLabel: { fontWeight:800, fontSize:12, textTransform:'uppercase', letterSpacing:1, color:'#aaa', margin:'18px 0 10px' },
  overlay:      { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 },
  modal:        { background:'#fff', borderRadius:16, padding:24, width:'90%', maxWidth:440, display:'flex', flexDirection:'column', gap:13, maxHeight:'90vh', overflowY:'auto' },
  lbl:          { display:'flex', flexDirection:'column', gap:5, fontSize:13, fontWeight:700, color:'#555' },
  inp:          { padding:'10px 12px', border:'1.5px solid #ddd', borderRadius:8, fontSize:15, color:'#222', background:'#fafafa', width:'100%', boxSizing:'border-box' },
};

const CSS = `
  * { box-sizing: border-box; }
  .btn-add:hover { opacity: 0.7; }
  .item-row:hover { background: rgba(0,0,0,0.025); border-radius: 8px; transition: background 0.1s; }
  .q-btn:hover { background: #1a1a2e !important; color: #e8c97e !important; border-color: #1a1a2e !important; transition: all 0.15s; }
  .recipe-card:hover { border-color: #1a1a2e !important; box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); transition: all 0.15s; }
  .big-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); transition: all 0.15s; }
  .big-btn:disabled { opacity: 0.38; cursor: not-allowed; }
  .back-btn:hover { text-decoration: underline; }
  .cat-pill:hover { background: #1a1a2e !important; color: #e8c97e !important; border-color: #1a1a2e !important; transition: all 0.15s; }
  .method-card:hover { border-color: #1a1a2e !important; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); transition: all 0.15s; }
  input:focus, select:focus, textarea:focus { outline: 2px solid #1a1a2e; outline-offset: -1px; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
