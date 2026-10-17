import { useInv } from '../store/InventoryContext.jsx';

export default function Expiry() {
  const { items, data, status, setExpiryDays } = useInv();
  const sorted = [...items].sort((a, b) => (a.expiry || '9').localeCompare(b.expiry || '9'));
  const groups = [['Expired', 'expired'], ['Expiring soon', 'expiring_soon'], ['No expiry date recorded', 'none']];
  return (
    <>
      <label className="field inline-field"><span>Warning period (days)</span>
        <input type="number" min="0" value={data.settings.expiryDays} onChange={(e) => setExpiryDays(e.target.value)} />
      </label>
      {groups.map(([title, key]) => {
        const rows = sorted.filter((i) => status(i) === key);
        return (
          <section className="card" key={key}>
            <h3>{title} ({rows.length})</h3>
            {rows.length === 0 ? <p className="muted">None.</p> : rows.map((i) => (
              <p key={i.id}><b>{i.name}</b> · {i.room} · {i.quantity} {i.unit} {i.expiry && <small>· {i.expiry}</small>}</p>
            ))}
          </section>
        );
      })}
    </>
  );
}
