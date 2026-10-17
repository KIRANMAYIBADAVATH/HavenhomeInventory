import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useInv } from '../store/InventoryContext.jsx';
import Modal from '../components/Modal.jsx';

const SUGGESTED = ['Bathroom', 'Balcony', 'Garage', 'Storage Room'];

function NamedList({ kind, title, field, suggestions = [] }) {
  const { data, items, addNamed, renameNamed, removeNamed, toast } = useInv();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [del, setDel] = useState(null);
  const [target, setTarget] = useState('');
  const list = data[kind];
  const count = (n) => items.filter((i) => i[field] === n).length;
  const missing = suggestions.filter((s) => !list.some((x) => x.toLowerCase() === s.toLowerCase()));

  const add = (n) => { const r = addNamed(kind, n); r.error ? setError(r.error) : (setError(''), setName('')); };
  const rename = (n) => {
    const v = window.prompt('New name', n);
    if (v && v.trim() !== n) { const r = renameNamed(kind, n, v); r.error && toast(r.error, 'err'); }
  };
  const confirmDel = () => {
    const r = removeNamed(kind, del, target);
    if (r.error) return toast(r.error, 'err');
    toast(`${del} removed`); setDel(null); setTarget('');
  };

  return (
    <section className="card">
      <h3>{title}</h3>
      <form className="inline" onSubmit={(e) => { e.preventDefault(); add(name); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${field}…`} aria-label={`New ${field}`} />
        <button className="btn primary sm">Add</button>
      </form>
      {error && <small className="err" role="alert">{error}</small>}
      {missing.length > 0 && (
        <div className="chips">{missing.map((s) => <button key={s} className="chip" onClick={() => add(s)}>+ {s}</button>)}</div>
      )}
      <ul className="plain">
        {list.map((n) => (
          <li key={n}>
            <span>{n} <small>({count(n)} items)</small></span>
            <span>
              <button className="icon" aria-label={`Rename ${n}`} onClick={() => rename(n)}><Pencil size={15} /></button>
              <button className="icon danger" aria-label={`Delete ${n}`}
                onClick={() => (count(n) === 0 ? (window.confirm(`Delete ${n}?`) && removeNamed(kind, n)) : setDel(n))}><Trash2 size={15} /></button>
            </span>
          </li>
        ))}
      </ul>
      {del && (
        <Modal title={`Delete “${del}”`} onClose={() => setDel(null)}>
          <div className="form single">
            <p>{count(del)} item(s) use this {field}. Move them to:</p>
            <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Move items to">
              <option value="">Choose…</option>{list.filter((x) => x !== del).map((x) => <option key={x}>{x}</option>)}
            </select>
            <div className="actions">
              <button className="btn ghost" onClick={() => setDel(null)}>Cancel</button>
              <button className="btn primary" disabled={!target} onClick={confirmDel}>Move items & delete</button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default function Rooms() {
  const { items } = useInv();
  const locs = [...new Set(items.map((i) => i.location).filter(Boolean))].sort();
  return (
    <div className="two">
      <NamedList kind="rooms" title="Rooms" field="room" suggestions={SUGGESTED} />
      <NamedList kind="categories" title="Categories" field="category" />
      <section className="card"><h3>Storage locations in use</h3>
        {locs.length === 0 ? <p className="muted">Locations appear here once you add them to items.</p> :
          <div className="chips">{locs.map((l) => <span key={l} className="chip">{l}</span>)}</div>}
      </section>
    </div>
  );
}
