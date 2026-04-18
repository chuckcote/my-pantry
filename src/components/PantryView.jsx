import { S } from '../styles.js';
import { CATEGORIES, CAT_ICONS, CAT_COLORS } from '../config.js';
import { expiryInfo, blank } from '../lib/utils.js';

export default function PantryView({ items, onNavigate, setForm, onDelete, onNudgeQty, onNormalize, normalizing, normalizeMsg }) {
  return (
    <main style={S.main}>
      {items.length === 0 && (
        <div style={S.emptyState}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🛒</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, marginBottom: 8 }}>Your pantry is empty</div>
          <div style={{ color: '#888', marginBottom: 20 }}>Use ⚡ Quick Fill to add everything at once!</div>
          <button style={S.bigBtn} className="big-btn" onClick={() => onNavigate('quickfill')}>⚡ Quick Fill my pantry</button>
        </div>
      )}
      {CATEGORIES.map(cat => {
        const catItems = items.filter(it => it.category === cat);
        const c = CAT_COLORS[cat];
        return (
          <section key={cat} style={{ ...S.section, background: c.bg, borderColor: c.border }}>
            <div style={S.sectionHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17 }}>
                <span style={{ fontSize: 22 }}>{CAT_ICONS[cat]}</span>
                <span style={{ color: c.accent, fontWeight: 700 }}>{cat}</span>
                <span style={{ ...S.badge, background: c.border, color: c.accent }}>{catItems.length}</span>
              </div>
              <button style={{ ...S.addBtn, color: c.accent, borderColor: c.border }} className="btn-add"
                onClick={() => setForm({ ...blank(cat), _isNew: true })}>+ Add</button>
            </div>
            {catItems.length === 0
              ? <div style={S.emptyRow}>Nothing here yet</div>
              : catItems.map(it => {
                  const exp = expiryInfo(it.expiry);
                  return (
                    <div key={it.id} style={S.row} className="item-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.rowName}>{it.name}</div>
                        {exp && <span style={{ ...S.pill, background: exp.bg, color: exp.color, fontSize: 11, fontWeight: 700, marginTop: 3, display: 'inline-block', padding: '2px 8px' }}>{exp.label}</span>}
                        {it.notes && <div style={S.rowNotes}>{it.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button style={S.qBtn} onClick={() => onNudgeQty(it.id, -1)} className="q-btn">−</button>
                        <span style={S.qtyLabel}>{it.qty} {it.unit}</span>
                        <button style={S.qBtn} onClick={() => onNudgeQty(it.id, 1)} className="q-btn">+</button>
                        <button style={S.iconBtn} onClick={() => setForm({ ...it, _isNew: false })} title="Edit">✏️</button>
                        <button style={S.iconBtn} onClick={() => onDelete(it.id)} title="Delete">×</button>
                      </div>
                    </div>
                  );
                })}
          </section>
        );
      })}

      {items.length > 0 && (
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <button onClick={onNormalize} disabled={normalizing} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 12, cursor: normalizing ? 'not-allowed' : 'pointer', padding: '6px 12px' }}>
            {normalizing ? '✨ Tidying up names…' : '✨ Tidy up names'}
          </button>
          {normalizeMsg && <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{normalizeMsg}</div>}
        </div>
      )}
    </main>
  );
}
