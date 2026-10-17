import { useState } from 'react';
import Modal from './Modal.jsx';
import { useInv } from '../store/InventoryContext.jsx';
import { compatibleUnits } from '../lib/units.js';

const LABEL = { use: 'Use Item', restock: 'Restock', adjust: 'Adjust Quantity' };

export default function StockModal({ item, type, onClose }) {
  const { stock, toast } = useInv();
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState(item.unit);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const r = stock(item.id, type, amount, unit, reason);
    if (r.error) { setError(r.error); setBusy(false); return; }
    toast(`${LABEL[type]} applied to ${item.name}`);
    onClose();
  };

  return (
    <Modal title={`${LABEL[type]}: ${item.name}`} onClose={onClose}>
      <form onSubmit={submit} className="form single">
        <p>Current: <b>{item.quantity} {item.unit}</b></p>
        <label className="field"><span>{type === 'adjust' ? 'New quantity' : 'Amount'}</span>
          <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
        </label>
        <label className="field"><span>Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>{compatibleUnits(item.unit).map((u) => <option key={u}>{u}</option>)}</select>
        </label>
        {type === 'adjust' && (
          <label className="field"><span>Reason *</span><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Recount, spillage, correction…" /></label>
        )}
        {error && <small className="err" role="alert">{error}</small>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>Apply</button>
        </div>
      </form>
    </Modal>
  );
}
