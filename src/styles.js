export const S = {
  header:       { background: '#1a1a2e', color: '#fff', padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, flexWrap: 'wrap', gap: 8 },
  brand:        { display: 'flex', alignItems: 'center', gap: 10 },
  brandName:    { fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, lineHeight: 1 },
  brandSub:     { fontSize: 11, color: '#aaa', marginTop: 2 },
  alertChip:    { background: '#c0392b', color: '#fff', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700 },
  nav:          { display: 'flex', background: '#2a2a40', borderRadius: 8, overflow: 'hidden' },
  navBtn:       { padding: '7px 12px', border: 'none', background: 'transparent', color: '#aaa', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  navActive:    { background: '#e8c97e', color: '#1a1a2e' },
  expiryBanner: { background: '#fff8e1', borderBottom: '1px solid #ffe082', padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pill:         { borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontSize: 12 },
  main:         { padding: '14px 16px', maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 },
  emptyState:   { background: '#fff', borderRadius: 16, padding: '48px 24px', textAlign: 'center', border: '1.5px solid #eee' },
  section:      { borderRadius: 14, border: '1.5px solid', padding: '14px 16px' },
  sectionHead:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge:        { borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 700 },
  addBtn:       { border: '1.5px solid', borderRadius: 8, background: 'transparent', padding: '5px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  emptyRow:     { color: '#bbb', fontSize: 13, textAlign: 'center', padding: '12px 0' },
  row:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: '1px solid rgba(0,0,0,0.06)' },
  rowName:      { fontWeight: 700, fontSize: 15 },
  rowNotes:     { fontSize: 12, color: '#888', marginTop: 2 },
  qBtn:         { width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  qtyLabel:     { minWidth: 68, textAlign: 'center', fontWeight: 600, fontSize: 14 },
  iconBtn:      { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px', opacity: 0.55, lineHeight: 1 },
  card:         { background: '#fff', border: '1.5px solid #eee', borderRadius: 16, padding: '22px 20px' },
  qfLabel:      { fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: '#aaa', marginBottom: 10 },
  catPill:      { padding: '9px 16px', borderRadius: 10, border: '1.5px solid #ddd', background: '#fafafa', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#555' },
  catPillActive:{ background: '#1a1a2e', color: '#e8c97e', borderColor: '#1a1a2e' },
  methodCard:   { background: '#fafafa', border: '2px solid #eee', borderRadius: 14, padding: '22px 16px', textAlign: 'center', cursor: 'pointer' },
  methodTitle:  { fontWeight: 800, fontSize: 15, marginBottom: 6 },
  methodSub:    { color: '#888', fontSize: 13, lineHeight: 1.5 },
  exampleBox:   { background: '#f7f5f0', border: '1px solid #e8e0d0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 1.6 },
  textarea:     { width: '100%', padding: '12px 14px', border: '1.5px solid #ddd', borderRadius: 10, fontSize: 14, color: '#222', background: '#fafafa', resize: 'vertical', fontFamily: "'Nunito',sans-serif", boxSizing: 'border-box' },
  errorMsg:     { color: '#c0392b', fontSize: 13, marginTop: 8 },
  photoPreview: { width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10 },
  reviewRow:    { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid #f0f0f0' },
  reviewName:   { flex: 1, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, color: '#222', minWidth: 0 },
  reviewQty:    { width: 52, padding: '5px 6px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, textAlign: 'center' },
  reviewUnit:   { width: 58, padding: '5px 3px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12 },
  reviewCat:    { width: 76, padding: '5px 3px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12 },
  bigBtn:       { padding: '13px 28px', background: '#1a1a2e', color: '#e8c97e', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.3 },
  spinner:      { width: 20, height: 20, border: '3px solid #eee', borderTop: '3px solid #1a1a2e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 },
  backBtn:      { background: 'none', border: 'none', color: '#1a1a2e', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 0, alignSelf: 'flex-start' },
  cancelBtn:    { padding: '10px 16px', border: '1.5px solid #ddd', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 14, color: '#555' },
  recipeCard:   { background: '#fff', border: '1.5px solid #eee', borderRadius: 14, padding: '16px 18px', cursor: 'pointer' },
  chip:         { borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  haveChip:     { background: '#eafaf1', color: '#1e8449' },
  missingChip:  { background: '#fdecea', color: '#c0392b' },
  sectionLabel: { fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', margin: '18px 0 10px' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:        { background: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 13, maxHeight: '90vh', overflowY: 'auto' },
  lbl:          { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 700, color: '#555' },
  inp:          { padding: '10px 12px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 15, color: '#222', background: '#fafafa', width: '100%', boxSizing: 'border-box' },
};

export const CSS = `
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
