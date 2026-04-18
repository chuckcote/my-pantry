import { S } from '../styles.js';
import { expiryInfo } from '../lib/utils.js';

export default function ExpiryBanner({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div style={S.expiryBanner}>
      <strong style={{ marginRight: 8, flexShrink: 0 }}>Use soon:</strong>
      {alerts.map(a => {
        const info = expiryInfo(a.expiry);
        return (
          <span key={a.id} style={{ ...S.pill, background: info.bg, color: info.color }}>
            {a.name} · {info.label}
          </span>
        );
      })}
    </div>
  );
}
