import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';
import { useInv } from '../store/InventoryContext.jsx';
import { UNITS } from '../lib/units.js';
import { api } from '../lib/api.js';

const blank = { name: '', category: '', room: '', location: '', quantity: 1, unit: 'pieces', minStock: 1, brand: '',
  purchaseDate: '', expiry: '', price: '', supplier: '', description: '', consumable: true };

const Field = ({ label, error, children }) => (
  <label className="field"><span>{label}</span>{children}{error && <small className="err" role="alert">{error}</small>}</label>
);

export default function ItemForm({ item, onClose }) {
  const { data, addItem, updateItem, toast } = useInv();
  const [f, setF] = useState(item ? { ...blank, ...item } : { ...blank, room: data.rooms[0] || '', category: data.categories[0] || '' });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState({ loading: false, text: '', error: '' });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (!f.category) e.category = 'Category is required';
    if (!f.room) e.room = 'Room is required';
    if (f.quantity === '' || isNaN(f.quantity) || Number(f.quantity) < 0) e.quantity = 'Enter a number ≥ 0';
    if (f.minStock !== '' && (isNaN(f.minStock) || Number(f.minStock) < 0)) e.minStock = 'Enter a number ≥ 0';
    if (f.price !== '' && (isNaN(f.price) || Number(f.price) < 0)) e.price = 'Enter a number ≥ 0';
    if (f.expiry && f.purchaseDate && f.expiry < f.purchaseDate) e.expiry = 'Expiry is before purchase date';
    return e;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (busy) return;
    const er = validate();
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    const clean = { ...f, name: f.name.trim(), quantity: Number(f.quantity), minStock: Number(f.minStock) || 0, price: f.price === '' ? '' : Number(f.price) };
    if (!clean.consumable) { clean.expiry = ''; clean.minStock = 0; }
    item ? updateItem(item.id, clean) : addItem(clean);
    toast(item ? 'Item updated' : 'Item added');
    onClose();
  };

  const gen = async () => {
    if (!f.name.trim() || !f.category) return setAi({ loading: false, text: '', error: 'Enter an item name and category first' });
    setAi({ loading: true, text: '', error: '' });
    try {
      const r = await api.generateNotes({ name: f.name.trim(), brand: f.brand.trim(), category: f.category });
      setAi({ loading: false, text: r.description, error: '' });
    } catch (e) { setAi({ loading: false, text: '', error: `${e.message}. You can still type notes manually.` }); }
  };
  const accept = () => {
    if (f.description.trim() && !window.confirm('Replace the existing description with the generated text?')) return;
    set('description', ai.text);
    setAi({ loading: false, text: '', error: '' });
  };

  return (
    <Modal title={item ? 'Edit Item' : 'Add Item'} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <Field label="Item name *" error={err.name}><input value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Field>
        <Field label="Brand"><input value={f.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
        <Field label="Category *" error={err.category}>
          <select value={f.category} onChange={(e) => set('category', e.target.value)}>{data.categories.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Room *" error={err.room}>
          <select value={f.room} onChange={(e) => set('room', e.target.value)}>{data.rooms.map((r) => <option key={r}>{r}</option>)}</select>
        </Field>
        <Field label="Storage location"><input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="Pantry, Drawer, Cabinet…" /></Field>
        <label className="check"><input type="checkbox" checked={f.consumable} onChange={(e) => set('consumable', e.target.checked)} /> Consumable (track low stock and expiry)</label>
        <Field label="Quantity" error={err.quantity}><input type="number" min="0" step="any" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} /></Field>
        <Field label="Unit">
          <select value={f.unit} onChange={(e) => set('unit', e.target.value)}>{Object.keys(UNITS).map((u) => <option key={u}>{u}</option>)}</select>
        </Field>
        {f.consumable && <>
          <Field label="Minimum stock" error={err.minStock}><input type="number" min="0" step="any" value={f.minStock} onChange={(e) => set('minStock', e.target.value)} /></Field>
          <Field label="Expiry date" error={err.expiry}><input type="date" value={f.expiry} onChange={(e) => set('expiry', e.target.value)} /></Field>
        </>}
        <Field label="Purchase date"><input type="date" value={f.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} /></Field>
        <Field label="Purchase price" error={err.price}><input type="number" min="0" step="any" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
        <Field label="Supplier"><input value={f.supplier} onChange={(e) => set('supplier', e.target.value)} /></Field>
        <div className="full">
          <Field label="Description / notes"><textarea rows="3" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <button type="button" className="btn ghost" onClick={gen} disabled={ai.loading}>
            {ai.loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} Generate Notes
          </button>
          {ai.error && <small className="err" role="alert"> {ai.error}</small>}
          {ai.text && (
            <div className="suggest">
              <p>{ai.text}</p>
              <button type="button" className="btn primary sm" onClick={accept}>Use this</button>
              <button type="button" className="btn ghost sm" onClick={gen}>Regenerate</button>
              <button type="button" className="btn ghost sm" onClick={() => setAi({ loading: false, text: '', error: '' })}>Discard</button>
            </div>
          )}
        </div>
        <div className="actions full">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{item ? 'Save changes' : 'Add item'}</button>
        </div>
      </form>
    </Modal>
  );
}
