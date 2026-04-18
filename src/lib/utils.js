export const uid       = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
export const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

export function expiryInfo(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return null;
  if (d < 0)   return { label: `Expired ${Math.abs(d)}d ago`, color: '#c0392b', bg: '#fdecea' };
  if (d === 0)  return { label: 'Expires today!',              color: '#c0392b', bg: '#fdecea' };
  if (d <= 3)   return { label: `${d}d left`,                  color: '#d35400', bg: '#fef3e2' };
  if (d <= 7)   return { label: `${d}d left`,                  color: '#b7950b', bg: '#fefde7' };
  return { label: `${d}d`, color: '#1e8449', bg: '#eafaf1' };
}

export const pantryText = (items) =>
  items.map(it => `- ${it.name}: ${it.qty} ${it.unit} [${it.category}]${it.expiry ? ` expires ${it.expiry}` : ''}`).join('\n');

export async function resizeImage(dataUrl, maxDim = 800, quality = 0.7) {
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

export const blank = (cat = 'Fridge') => ({
  id: uid(), name: '', qty: '1', unit: 'pcs', category: cat, expiry: '', notes: '',
});
