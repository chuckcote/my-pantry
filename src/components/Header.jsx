import { S } from '../styles.js';

const NAV_ITEMS = [['home', 'Pantry'], ['quickfill', '⚡ Fill'], ['ai', '🍳 Recipes']];

export default function Header({ items, syncing, alerts, view, onNavigate }) {
  return (
    <header style={S.header}>
      <div style={S.brand}>
        <span style={{ fontSize: 26 }}>🥘</span>
        <div>
          <div style={S.brandName}>My Pantry</div>
          <div style={S.brandSub}>{items.length} items {syncing ? '· saving…' : '· synced ☁️'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {alerts.length > 0 && <div style={S.alertChip}>⚠️ {alerts.length}</div>}
        <nav style={S.nav}>
          {NAV_ITEMS.map(([v, label]) => (
            <button key={v} style={{ ...S.navBtn, ...(view === v ? S.navActive : {}) }}
              onClick={() => onNavigate(v)}>{label}</button>
          ))}
        </nav>
      </div>
    </header>
  );
}
