import { useState, useEffect } from 'react';
import { db, DB } from './lib/db.js';
import { daysUntil } from './lib/utils.js';
import { CSS } from './styles.js';
import Header from './components/Header.jsx';
import ExpiryBanner from './components/ExpiryBanner.jsx';
import PantryView from './components/PantryView.jsx';
import QuickFillView from './components/QuickFillView.jsx';
import RecipesView from './components/RecipesView.jsx';
import ItemFormModal from './components/ItemFormModal.jsx';

export default function App() {
  const [items,      setItems]      = useState([]);
  const [ready,      setReady]      = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [view,       setView]       = useState('home');
  const [form,       setForm]       = useState(null);
  const [normalizing, setNormalizing] = useState(false);
  const [normalizeMsg, setNormalizeMsg] = useState('');

  // Initial load + splash removal
  useEffect(() => {
    DB.load().then(data => {
      setItems(data);
      setReady(true);
      const splash = document.getElementById('splash');
      if (splash) { splash.classList.add('hidden'); setTimeout(() => splash.remove(), 500); }
    });
  }, []);

  // Realtime sync across tabs/devices
  useEffect(() => {
    const channel = db.channel('pantry-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pantry_items' }, () => DB.load().then(setItems))
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

  const deleteItem = async (id) => {
    setItems(p => p.filter(it => it.id !== id));
    await DB.remove(id);
  };

  const nudgeQty = async (id, delta) => {
    const item = items.find(it => it.id === id);
    if (!item) return;
    const newQty = String(Math.max(0, (parseFloat(item.qty) || 0) + delta));
    setItems(p => p.map(it => it.id === id ? { ...it, qty: newQty } : it));
    await DB.update(id, { qty: newQty });
  };

  const addItems = async (newItems) => {
    setItems(p => [...p, ...newItems]);
    await DB.bulkInsert(newItems);
  };

  const cookRecipe = async (recipe) => {
    const updates = [];
    const next = items.map(it => {
      const use = recipe.uses?.find(u => u.name.toLowerCase() === it.name.toLowerCase());
      if (!use) return it;
      const newQty = String(Math.max(0, (parseFloat(it.qty) || 0) - (use.amount || 0)));
      updates.push(DB.update(it.id, { qty: newQty }));
      return { ...it, qty: newQty };
    });
    setItems(next);
    await Promise.all(updates);
    setView('home');
  };

  const normalizePantry = async () => {
    setNormalizing(true); setNormalizeMsg('');
    try {
      const res = await fetch('/api/normalize', { method: 'POST' });
      const d   = await res.json();
      setNormalizeMsg(d.updated > 0 ? `✨ Tidied ${d.updated} item${d.updated === 1 ? '' : 's'}` : '✓ Everything looks good');
    } catch { setNormalizeMsg('Failed — try again'); }
    setNormalizing(false);
    setTimeout(() => setNormalizeMsg(''), 4000);
  };

  const alerts = items.filter(it => { const d = daysUntil(it.expiry); return d !== null && d <= 3; });

  if (!ready) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f5f0', fontFamily: "'Nunito',sans-serif", color: '#222' }}>
      <style>{CSS}</style>
      <Header items={items} syncing={syncing} alerts={alerts} view={view} onNavigate={setView} />
      {view === 'home' && <ExpiryBanner alerts={alerts} />}
      {view === 'home'      && <PantryView items={items} onNavigate={setView} setForm={setForm} onDelete={deleteItem} onNudgeQty={nudgeQty} onNormalize={normalizePantry} normalizing={normalizing} normalizeMsg={normalizeMsg} />}
      {view === 'quickfill' && <QuickFillView onConfirm={addItems} onNavigate={setView} />}
      {view === 'ai'        && <RecipesView items={items} onCook={cookRecipe} />}
      <ItemFormModal form={form} setForm={setForm} onSave={saveForm} />
    </div>
  );
}
