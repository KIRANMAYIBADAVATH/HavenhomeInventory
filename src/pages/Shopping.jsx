import { useState } from 'react';
import { Trash2, Pencil, Download } from 'lucide-react';
import { useInv } from '../store/InventoryContext.jsx';
import { UNITS } from '../lib/units.js';
import { downloadCsv } from '../lib/csv.js';

const empty = { name: '', quantity: 1, unit: 'pieces', price: '', itemId: '' };

export default function Shopping() {
  const { data, items, addShopping, updateShopping, removeShopping, togglePurchased, confirmPurchase, toast } = useInv();
  const [f, setF] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const pickItem = (id) => {
    const it = items.find((i) => i.id === id);
    setF((p) => ({ ...p, itemId: id, ...(it ? { name: it.name, unit: it.unit } : {}) }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setError('Name is required');
    if (!(Number(f.quantity) > 0)) return setError('Quantity must be greater than 0');
    if (f.price !== '' && Number(f.price) < 0) return setError('Price cannot be negative');
    const entry = { name: f.name.trim(), quantity: Number(f.quantity), unit: f.unit, price: f.price === '' ? '' : Number(f.price), itemId: f.itemId || null };
    if (editing) { updateShopping(editing, entry); setEditing(null); toast('Entry updated'); }
    else { const r = addShopping(entry); if (r.error) return setError(r.error); toast('Added to shopping list'); }
    setError(''); setF(empty);
  };

  const confirm = (id) => { const r = confirmPurchase(id); r.error ? toast(r.error, 'err') : toast('Purchase added to inventory'); };
  const remaining = data.shopping.filter((s) => !s.purchased).length;

  return (
    <>
      <form className="card form" onSubmit={submit} noValidate>
        <label className="field"><span>Item *</span><input value={f.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="field"><span>Link to inventory item (needed to add stock)</span>
          <select value={f.itemId} onChange={(e) => pickItem(e.target.value)}><option value="">None</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select>
        </label>
        <label className="field"><span>Quantity</span><input type="number" min="0" step="any" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} /></label>
        <label className="field"><span>Unit</span><select value={f.unit} onChange={(e) => set('unit', e.target.value)}>{Object.keys(UNITS).map((u) => <option key={u}>{u}</option>)}</select></label>
        <label className="field"><span>Estimated price</span><input type="number" min="0" step="any" value={f.price} onChange={(e) => set('price', e.target.value)} /></label>
        <div className="actions"><button className="btn primary">{editing ? 'Save entry' : 'Add to list'}</button>
          {editing && <button type="button" className="btn ghost" onClick={() => { setEditing(null); setF(empty); }}>Cancel</button>}</div>
        {error && <small className="err full" role="alert">{error}</small>}
      </form>

      <div className="between"><h3>{remaining} remaining</h3>
        <button className="btn ghost sm" onClick={() => downloadCsv('shopping-list', data.shopping, [['Item', 'name'], ['Quantity', 'quantity'], ['Unit', 'unit'], ['Est. price', 'price'], ['Purchased', 'purchased'], ['Added to inventory', 'stocked']])}><Download size={14} /> CSV</button></div>

      {data.shopping.length === 0 ? <div className="empty">Your shopping list is empty.</div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Item</th><th>Qty</th><th>Est. price</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{data.shopping.map((s) => (
            <tr key={s.id} className={s.purchased ? 'done' : ''}>
              <td>{s.name}</td><td>{s.quantity} {s.unit}</td><td>{s.price === '' ? '—' : s.price}</td>
              <td>{s.stocked ? 'In inventory' : s.purchased ? 'Purchased' : 'To buy'}</td>
              <td className="row-actions">
                {!s.stocked && <button className="btn ghost sm" onClick={() => togglePurchased(s.id)}>{s.purchased ? 'Undo purchased' : 'Mark purchased'}</button>}
                {s.purchased && !s.stocked && <button className="btn primary sm" onClick={() => confirm(s.id)}>Add to inventory</button>}
                {!s.stocked && <button className="icon" aria-label="Edit" onClick={() => { setEditing(s.id); setF({ ...s, itemId: s.itemId || '' }); }}><Pencil size={16} /></button>}
                <button className="icon danger" aria-label="Remove" onClick={() => removeShopping(s.id)}><Trash2 size={16} /></button>
              </td>
            </tr>))}</tbody>
        </table></div>
      )}
    </>
  );
}
