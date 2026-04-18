import { useState } from 'react';
import { S } from '../styles.js';
import { claudeText } from '../lib/ai.js';
import { pantryText } from '../lib/utils.js';

// RecipesView owns its own AI state — only bubbles up when user cooks a recipe.
export default function RecipesView({ items, onCook }) {
  const [loading, setLoading]               = useState(false);
  const [recipes, setRecipes]               = useState(null);
  const [error, setError]                   = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const getRecipes = async () => {
    setLoading(true); setRecipes(null); setError(''); setSelectedRecipe(null);
    try {
      const raw = await claudeText(
        'You are a home chef. Return EXACTLY 3 recipes as a JSON array. Each: { "title", "time", "description"(1 sentence), "steps"(4-6 strings), "uses":[{"name","amount","unit"}] }. ONLY valid JSON, no markdown.',
        `My pantry:\n${pantryText(items)}\nSuggest 3 recipes.`
      );
      setRecipes(JSON.parse(raw.replace(/```json|```/g, '').trim()));
    } catch (err) {
      console.error('Recipe error:', err);
      setError(err.message || 'Something went wrong. Try again.');
    }
    setLoading(false);
  };

  return (
    <main style={S.main}>
      {!selectedRecipe ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={S.card}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700 }}>What can I cook today?</div>
            <div style={{ color: '#666', fontSize: 14, margin: '8px 0 20px' }}>I'll check your full pantry and suggest recipes you can make now.</div>
            <button style={S.bigBtn} className="big-btn" onClick={getRecipes} disabled={loading || items.length === 0}>
              {loading ? 'Finding recipes…' : '✨ Suggest Recipes'}
            </button>
            {items.length === 0 && <p style={{ color: '#aaa', fontSize: 13, marginTop: 12 }}>Add items first.</p>}
            {error && <div style={S.errorMsg}>{error}</div>}
          </div>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', padding: 24 }}>
              <div style={S.spinner} /><span style={{ color: '#888' }}>Checking your pantry…</span>
            </div>
          )}
          {recipes?.map((r, i) => (
            <div key={i} style={S.recipeCard} className="recipe-card" onClick={() => setSelectedRecipe(r)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700 }}>{r.title}</div>
                <div style={{ color: '#888', fontSize: 13 }}>⏱ {r.time}</div>
              </div>
              <div style={{ color: '#555', fontSize: 14, marginBottom: 12 }}>{r.description}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {r.uses?.map((u, j) => {
                  const have = items.find(it => it.name.toLowerCase() === u.name.toLowerCase());
                  return <span key={j} style={{ ...S.chip, ...(have ? S.haveChip : S.missingChip) }}>{have ? '✓' : '✗'} {u.name}</span>;
                })}
              </div>
              <div style={{ color: '#1a1a2e', fontSize: 13, fontWeight: 700 }}>View recipe & cook →</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button style={S.backBtn} onClick={() => setSelectedRecipe(null)} className="back-btn">← Back</button>
          <div style={S.card}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700 }}>{selectedRecipe.title}</div>
            <div style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>⏱ {selectedRecipe.time}</div>
            <div style={{ color: '#555', fontSize: 15, marginBottom: 20 }}>{selectedRecipe.description}</div>
            <div style={S.sectionLabel}>Ingredients</div>
            {selectedRecipe.uses?.map((u, i) => {
              const have = items.find(it => it.name.toLowerCase() === u.name.toLowerCase());
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 15, borderBottom: '1px solid #f5f5f5', opacity: have ? 1 : 0.5 }}>
                  <span>{have ? '✅' : '❌'}</span>
                  <span style={{ fontWeight: 600 }}>{u.amount} {u.unit} {u.name}</span>
                  {!have && <span style={{ color: '#c0392b', fontSize: 12 }}>(not in pantry)</span>}
                </div>
              );
            })}
            <div style={S.sectionLabel}>Steps</div>
            {selectedRecipe.steps?.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ background: '#1a1a2e', color: '#e8c97e', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 14, lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
            <button style={{ ...S.bigBtn, width: '100%', marginTop: 28 }} className="big-btn" onClick={() => onCook(selectedRecipe)}>
              ✅ I cooked this! Deduct ingredients
            </button>
            <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 8 }}>Quantities updated in the cloud automatically.</div>
          </div>
        </div>
      )}
    </main>
  );
}
