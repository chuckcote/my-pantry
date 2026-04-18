import { S } from '../styles.js';
import { CATEGORIES, UNITS } from '../config.js';

export default function ItemFormModal({ form, setForm, onSave }) {
  if (!form) return null;
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && setForm(null)}>
      <div style={S.modal}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, margin: '0 0 18px' }}>
          {form._isNew ? `Add to ${form.category}` : 'Edit item'}
        </h3>
        <label style={S.lbl}>Name
          <input style={S.inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Chicken breast" autoFocus />
        </label>
        <label style={S.lbl}>Location
          <select style={S.inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ ...S.lbl, flex: 1 }}>Qty
            <input style={S.inp} type="number" min="0" value={form.qty}
              onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
          </label>
          <label style={{ ...S.lbl, width: 90 }}>Unit
            <select style={S.inp} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </label>
        </div>
        <label style={S.lbl}>Expiry
          <input style={S.inp} type="date" value={form.expiry || ''} onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))} />
        </label>
        <label style={S.lbl}>Notes
          <input style={S.inp} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <button style={S.cancelBtn} onClick={() => setForm(null)}>Cancel</button>
          <button style={{ ...S.bigBtn, padding: '10px 24px', fontSize: 14 }} className="big-btn" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
