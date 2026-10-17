import { useState } from 'react';
import { Download } from 'lucide-react';
import { useInv } from '../store/InventoryContext.jsx';
import { downloadCsv } from '../lib/csv.js';

const TYPES = ['create', 'update', 'delete', 'use', 'restock', 'adjust', 'purchase'];

export default function Activity() {
  const { data } = useInv();
  const [type, setType] = useState('');
  const [newest, setNewest] = useState(true);
  let rows = data.activity.filter((a) => !type || a.type === type);
  if (!newest) rows = [...rows].reverse();

  return (
    <>
      <div className="filters">
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by action"><option value="">All actions</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <select value={newest ? 'new' : 'old'} onChange={(e) => setNewest(e.target.value === 'new')} aria-label="Sort"><option value="new">Newest first</option><option value="old">Oldest first</option></select>
        <button className="btn ghost sm" onClick={() => downloadCsv('stock-transactions', rows, [['Time', 'at'], ['Action', 'type'], ['Item', 'itemName'], ['Previous', 'prev'], ['Change', 'change'], ['Result', 'result'], ['Unit', 'unit'], ['Reason', 'reason']])}><Download size={14} /> CSV</button>
      </div>
      {rows.length === 0 ? <div className="empty">No activity recorded yet.</div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Time</th><th>Action</th><th>Item</th><th>Previous</th><th>Change</th><th>Result</th><th>Reason</th></tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.id}><td>{new Date(a.at).toLocaleString()}</td><td>{a.type}</td><td>{a.itemName}</td>
              <td>{a.prev ?? '—'}</td><td>{a.change ?? '—'}</td><td>{a.result ?? '—'} {a.unit}</td><td>{a.reason || '—'}</td></tr>))}</tbody>
        </table></div>
      )}
    </>
  );
}
