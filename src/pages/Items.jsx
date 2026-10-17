import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Minus, Plus, SlidersHorizontal, Pencil, ShoppingCart, Trash2, Sparkles, Download, Loader2, X } from 'lucide-react';
import { useInv } from '../store/InventoryContext.jsx';
import { isLow } from '../lib/status.js';
import { api } from '../lib/api.js';
import { downloadCsv } from '../lib/csv.js';
import ItemForm from '../components/ItemForm.jsx';
import StockModal from '../components/StockModal.jsx';

const EXP_LABEL = { expired: 'Expired', expiring_soon: 'Expiring soon', none: 'No expiry date' };

export default function Items({ fixed = {} }) {
  const { data, items, status, deleteItem, addShopping, toast } = useInv();
  const [sp, setSp] = useSearchParams();
  const [edit, setEdit] = useState(null);
  const [stockOp, setStockOp] = useState(null);
  const [aiText, setAiText] = useState('');
  const [ai, setAi] = useState({ loading: false, error: '' });

  const f = { q: '', room: '', category: '', location: '', low: '', expiry: '', sort: 'name', ...Object.fromEntries(sp), ...fixed };
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); };
  const locations = [...new Set(items.map((i) => i.location).filter(Boolean))].sort();

  const text = f.q.toLowerCase();
  let list = items.filter((i) => {
    if (text && ![i.name, i.brand, i.category, i.room, i.location, i.description].join(' ').toLowerCase().includes(text)) return false;
    if (f.room && i.room !== f.room) return false;
    if (f.category && i.category !== f.category) return false;
    if (f.location && i.location !== f.location) return false;
    if (f.low && !isLow(i)) return false;
    if (f.expiry && status(i) !== f.expiry) return false;
    return true;
  });
  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name),
    quantity: (a, b) => a.quantity - b.quantity,
    category: (a, b) => a.category.localeCompare(b.category),
    expiry: (a, b) => (a.expiry || '9').localeCompare(b.expiry || '9'),
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  };
  list = [...list].sort(sorters[f.sort] || sorters.name);

  const runAi = async (e) => {
    e.preventDefault();
    if (!aiText.trim()) return;
    setAi({ loading: true, error: '' });
    try {
      const r = await api.interpretSearch(aiText.trim(), data.rooms, data.categories);
      const n = new URLSearchParams(sp);
      [['room', r.room], ['category', r.category], ['q', r.text], ['low', r.low ? '1' : ''], ['expiry', r.expiry]].forEach(([k, v]) => v && n.set(k, v));
      setSp(n);
      setAi({ loading: false, error: '' });
    } catch (err) { setAi({ loading: false, error: `${err.message}. Manual search and filters still work.` }); }
  };

  const chips = [['q', f.q && `Text: ${f.q}`], ['room', f.room && `Room: ${f.room}`], ['category', f.category && `Category: ${f.category}`],
    ['location', f.location && `Location: ${f.location}`], ['low', f.low && 'Low stock'], ['expiry', f.expiry && EXP_LABEL[f.expiry]]]
    .filter(([k, v]) => v && !(k in fixed));

  const addToList = (i) => {
    const r = addShopping({ name: i.name, quantity: Math.max(Math.round((i.minStock * 2 - i.quantity) * 100) / 100, 1), unit: i.unit, price: '', itemId: i.id });
    r.error ? toast(r.error, 'err') : toast(`${i.name} added to shopping list`);
  };

  const exportCsv = () => downloadCsv('inventory', list, [['Name', 'name'], ['Brand', 'brand'], ['Category', 'category'], ['Room', 'room'],
    ['Location', 'location'], ['Quantity', 'quantity'], ['Unit', 'unit'], ['Min stock', 'minStock'], ['Expiry', 'expiry'],
    ['Price', 'price'], ['Supplier', 'supplier'], ['Notes', 'description'], ['Updated', 'updatedAt']]);

  return (
    <>
      <form className="ai-bar" onSubmit={runAi}>
        <Sparkles size={16} />
        <input value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder='Ask AI: "Kitchen lo unna items chupinchu", "low stock", "expiring soon"' aria-label="AI search" />
        <button className="btn primary sm" disabled={ai.loading}>{ai.loading ? <Loader2 size={14} className="spin" /> : 'Ask AI'}</button>
      </form>
      {ai.error && <small className="err" role="alert">{ai.error}</small>}

      <div className="filters">
        <input placeholder="Search name, brand, notes…" value={f.q} onChange={(e) => set('q', e.target.value)} aria-label="Search" />
        <select value={f.room} onChange={(e) => set('room', e.target.value)} aria-label="Room"><option value="">All rooms</option>{data.rooms.map((r) => <option key={r}>{r}</option>)}</select>
        <select value={f.category} onChange={(e) => set('category', e.target.value)} aria-label="Category"><option value="">All categories</option>{data.categories.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={f.location} onChange={(e) => set('location', e.target.value)} aria-label="Location"><option value="">All locations</option>{locations.map((l) => <option key={l}>{l}</option>)}</select>
        <select value={f.expiry} onChange={(e) => set('expiry', e.target.value)} aria-label="Expiry status">
          <option value="">Any expiry</option><option value="expiring_soon">Expiring soon</option><option value="expired">Expired</option><option value="none">No expiry date</option>
        </select>
        <select value={f.sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort by">
          <option value="name">Sort: Name</option><option value="quantity">Quantity</option><option value="category">Category</option><option value="expiry">Expiry date</option><option value="updated">Last updated</option>
        </select>
        <label className="check"><input type="checkbox" checked={!!f.low} disabled={'low' in fixed} onChange={(e) => set('low', e.target.checked ? '1' : '')} /> Low stock</label>
        <button className="btn ghost sm" onClick={exportCsv}><Download size={14} /> CSV</button>
      </div>

      {chips.length > 0 && (
        <div className="chips">
          {chips.map(([k, label]) => <button key={k} className="chip" onClick={() => set(k, '')}>{label} <X size={12} /></button>)}
          <button className="btn ghost sm" onClick={() => setSp({})}>Clear all filters</button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">{items.length === 0 ? 'No items yet. Use “Add Item” to record your first one.' : 'No items match your search or filters.'}</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Where</th><th>Quantity</th><th>Expiry</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((i) => {
                const es = status(i);
                return (
                  <tr key={i.id}>
                    <td><b>{i.name}</b>{i.demo && <span className="badge">demo</span>}<br /><small>{[i.brand, i.category].filter(Boolean).join(' · ')}</small></td>
                    <td>{i.room}<br /><small>{i.location}</small></td>
                    <td>{i.quantity} {i.unit} {isLow(i) && <span className="badge warn">Low</span>}</td>
                    <td>{i.expiry || '—'} {(es === 'expired' || es === 'expiring_soon') && <span className={`badge ${es === 'expired' ? 'bad' : 'warn'}`}>{EXP_LABEL[es]}</span>}</td>
                    <td className="row-actions">
                      <button className="icon" title="Use" aria-label={`Use ${i.name}`} onClick={() => setStockOp({ item: i, type: 'use' })}><Minus size={16} /></button>
                      <button className="icon" title="Restock" aria-label={`Restock ${i.name}`} onClick={() => setStockOp({ item: i, type: 'restock' })}><Plus size={16} /></button>
                      <button className="icon" title="Adjust" aria-label={`Adjust ${i.name}`} onClick={() => setStockOp({ item: i, type: 'adjust' })}><SlidersHorizontal size={16} /></button>
                      <button className="icon" title="Add to shopping list" aria-label={`Add ${i.name} to shopping list`} onClick={() => addToList(i)}><ShoppingCart size={16} /></button>
                      <button className="icon" title="Edit" aria-label={`Edit ${i.name}`} onClick={() => setEdit(i)}><Pencil size={16} /></button>
                      <button className="icon danger" title="Delete" aria-label={`Delete ${i.name}`}
                        onClick={() => window.confirm(`Delete “${i.name}”? This cannot be undone.`) && (deleteItem(i.id), toast('Item deleted'))}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {edit && <ItemForm item={edit} onClose={() => setEdit(null)} />}
      {stockOp && <StockModal {...stockOp} onClose={() => setStockOp(null)} />}
    </>
  );
}
